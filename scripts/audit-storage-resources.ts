import { createClient } from '@supabase/supabase-js';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';

dns.setDefaultResultOrder('ipv4first');

function readLocalEnv(): Record<string, string> {
  const envFile = path.resolve('.env.local');
  if (!fs.existsSync(envFile)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envFile, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const splitAt = line.indexOf('=');
        return [line.slice(0, splitAt), line.slice(splitAt + 1).trim()];
      })
  );
}

const localEnv = readLocalEnv();
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || localEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!serviceKey && !anonKey)) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local.');
}

const shouldRepair = process.argv.includes('--repair');
const verifyHttp = process.argv.includes('--verify-http');

if (shouldRepair && !serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for --repair mode.');
}

function formatError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
  return cause ? `${err.message} (${cause.code || cause.message || String(cause)})` : err.message;
}

async function withRetry<T>(fn: () => PromiseLike<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

const supabase = createClient(supabaseUrl, serviceKey || anonKey!, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

function extractStorageRef(fileUrl: string | null): { bucket: string; path: string } | null {
  if (!fileUrl) return null;
  const match = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (!match) return null;
  try {
    return { bucket: match[1], path: decodeURIComponent(match[2]).replace(/^\/+/, '') };
  } catch {
    return { bucket: match[1], path: match[2].replace(/^\/+/, '') };
  }
}

function isBrokenLocalOrTempUrl(fileUrl: string | null): boolean {
  if (!fileUrl) return false;
  return (
    fileUrl.startsWith('blob:') ||
    fileUrl.startsWith('file://') ||
    fileUrl.startsWith('/api/files/') ||
    /^[A-Za-z]:[\\/]/.test(fileUrl) ||
    fileUrl.includes('/storage/v1/object/sign/')
  );
}

async function verifySignedAccess(bucket: string, objectPath: string) {
  try {
    const { data, error } = await withRetry(() => supabase.storage.from(bucket).createSignedUrl(objectPath, 120));
    if (error || !data?.signedUrl) {
      return { ok: false, error: error?.message || 'Could not generate signed URL' };
    }
    if (verifyHttp) {
      const res = await withRetry(() => fetch(data.signedUrl, { method: 'HEAD' }));
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status} when fetching signed URL` };
      }
      return {
        ok: true,
        contentType: res.headers.get('content-type'),
        contentLength: res.headers.get('content-length') ? Number(res.headers.get('content-length')) : null,
      };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function runWorker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

async function main() {
  console.log(`Storage Audit Mode: ${serviceKey ? 'service_role (full)' : 'anon (published public visitor check)'}`);
  if (shouldRepair) console.log('Repair mode enabled: fixing broken URL/path references non-destructively.');

  const { data: resources, error: resErr } = await withRetry(() =>
    supabase
      .from('resources')
      .select('id,subject_id,title,storage_bucket,file_url,file_path,file_name,file_size_bytes,mime_type,is_published,deleted_at,subject:subjects(code,is_published)')
      .order('id')
  );
  if (resErr) throw new Error(`Could not query resources: ${resErr.message}`);

  const { data: syllabi, error: sylErr } = await withRetry(() =>
    supabase
      .from('subject_syllabi')
      .select('id,subject_id,title,storage_bucket,file_path,file_name,file_size_bytes,mime_type,is_published,subject:subjects(code,is_published)')
      .order('id')
  );
  if (sylErr) throw new Error(`Could not query subject_syllabi: ${sylErr.message}`);

  const issues: Array<{ table: string; id: string | number; subject?: string; title: string; reason: string }> = [];
  const fileResources = (resources || []).filter((row) => row.file_path || row.file_url);
  console.log(`Checking ${fileResources.length} resource files and ${(syllabi || []).length} syllabi...`);

  let healthyResources = 0;
  let repairedResources = 0;

  await mapConcurrent(fileResources, 6, async (row) => {
    const subjCode = (row.subject as { code?: string } | null)?.code;
    let bucket = row.storage_bucket || 'study-resources';
    let objectPath = row.file_path ? String(row.file_path).trim().replace(/^\/+/, '') : '';

    if (!objectPath && row.file_url) {
      const extracted = extractStorageRef(row.file_url);
      if (extracted) {
        bucket = extracted.bucket;
        objectPath = extracted.path;
        if (shouldRepair) {
          const { error: upErr } = await supabase
            .from('resources')
            .update({ file_path: objectPath, file_url: null, storage_bucket: bucket })
            .eq('id', row.id);
          if (upErr) {
            issues.push({ table: 'resources', id: row.id, subject: subjCode, title: row.title, reason: `Repair failed: ${upErr.message}` });
            return;
          }
          repairedResources++;
        } else {
          issues.push({ table: 'resources', id: row.id, subject: subjCode, title: row.title, reason: 'Legacy Supabase URL stored in file_url instead of file_path (run with --repair or apply migration 007)' });
          return;
        }
      } else if (isBrokenLocalOrTempUrl(row.file_url)) {
        issues.push({ table: 'resources', id: row.id, subject: subjCode, title: row.title, reason: `Invalid temporary/local file_url: ${row.file_url}` });
        return;
      } else {
        healthyResources++;
        return;
      }
    }

    if (!objectPath) {
      issues.push({ table: 'resources', id: row.id, subject: subjCode, title: row.title, reason: 'Missing file_path' });
      return;
    }

    const check = await verifySignedAccess(bucket, objectPath);
    if (!check.ok) {
      issues.push({ table: 'resources', id: row.id, subject: subjCode, title: row.title, reason: `${check.error} (bucket=${bucket}, path=${objectPath})` });
      return;
    }

    if (verifyHttp && row.file_size_bytes && check.contentLength && check.contentLength !== Number(row.file_size_bytes)) {
      issues.push({ table: 'resources', id: row.id, subject: subjCode, title: row.title, reason: `Size mismatch: DB=${row.file_size_bytes}, storage=${check.contentLength}` });
      return;
    }

    healthyResources++;
  });

  let healthySyllabi = 0;
  await mapConcurrent(syllabi || [], 6, async (row) => {
    const subjCode = (row.subject as { code?: string } | null)?.code;
    const bucket = row.storage_bucket || 'study-resources';
    const objectPath = String(row.file_path || '').trim().replace(/^\/+/, '');
    if (!objectPath) {
      issues.push({ table: 'subject_syllabi', id: row.id, subject: subjCode, title: row.title, reason: 'Missing file_path' });
      return;
    }
    const check = await verifySignedAccess(bucket, objectPath);
    if (!check.ok) {
      issues.push({ table: 'subject_syllabi', id: row.id, subject: subjCode, title: row.title, reason: `${check.error} (bucket=${bucket}, path=${objectPath})` });
      return;
    }
    healthySyllabi++;
  });

  console.log(`\nSummary:`);
  console.log(`- Resources checked: ${fileResources.length}, healthy: ${healthyResources}, repaired: ${repairedResources}`);
  console.log(`- Syllabi checked: ${(syllabi || []).length}, healthy: ${healthySyllabi}`);
  console.log(`- Issues found: ${issues.length}`);

  if (issues.length > 0) {
    console.log('\nIssues:');
    for (const issue of issues) {
      console.log(`  [${issue.table} #${issue.id}] ${issue.subject || 'N/A'} | ${issue.title} => ${issue.reason}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(formatError(err));
  process.exitCode = 1;
});
