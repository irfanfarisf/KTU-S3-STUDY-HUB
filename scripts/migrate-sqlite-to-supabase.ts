import { createClient } from '@supabase/supabase-js';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

function readLocalEnv(): Record<string, string> {
  const envFile = path.resolve('.env.local');
  if (!fs.existsSync(envFile)) return {};
  return Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => { const splitAt = line.indexOf('='); return [line.slice(0, splitAt), line.slice(splitAt + 1).trim()]; }));
}

const localEnv = readLocalEnv();
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || localEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error('Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in the environment or ignored .env.local file.');
}

const dataDirectory = path.resolve(process.env.APP_DATA_DIR || path.join(process.cwd(), 'data'));
const dbPath = path.resolve(process.env.SQLITE_DB_PATH || path.join(dataDirectory, 'studyhub.db'));
const uploadsDirectory = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'storage', 'uploads'));
if (!fs.existsSync(dbPath)) throw new Error(`SQLite database not found: ${dbPath}`);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const db = new DatabaseSync(dbPath, { readOnly: true });

const booleanColumns = new Set(['is_active', 'is_current', 'is_published', 'is_solved', 'is_important']);
const tables = ['universities', 'schemes', 'academic_years', 'branches', 'semesters', 'subjects', 'modules', 'topics', 'resources', 'questions', 'answers', 'programs', 'revision_items'];

async function uploadLegacyResource(row: Record<string, unknown>): Promise<Record<string, unknown>> {
  const next = { ...row };
  const url = String(row.file_url || '');
  const prefix = '/api/files/';
  if (!url.startsWith(prefix)) return next;
  const filename = path.basename(decodeURIComponent(url.slice(prefix.length)));
  const localPath = path.join(uploadsDirectory, filename);
  if (!fs.existsSync(localPath)) {
    console.warn(`Skipping missing local upload for resource ${row.id}: ${filename}`);
    next.file_url = null;
    return next;
  }
  const storagePath = `resources/${row.subject_id}/${filename}`;
  const bytes = fs.readFileSync(localPath);
  const { error } = await supabase.storage.from('study-resources').upload(storagePath, bytes, {
    contentType: String(row.mime_type || 'application/octet-stream'),
    upsert: true,
  });
  if (error) throw new Error(`Could not upload ${filename}: ${error.message}`);
  next.file_path = storagePath;
  next.file_url = null;
  return next;
}

async function main() {
  console.log(`Importing SQLite content from ${dbPath}`);
  for (const table of tables) {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id`).all() as Array<Record<string, unknown>>;
    if (!rows.length) continue;
    const normalized = rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
      key,
      booleanColumns.has(key) && value !== null ? Boolean(value) : value,
    ])));
    if (table === 'resources') {
      for (let i = 0; i < normalized.length; i++) normalized[i] = await uploadLegacyResource(normalized[i]);
    }
    for (let offset = 0; offset < normalized.length; offset += 100) {
      const chunk = normalized.slice(offset, offset + 100);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
      if (error) {
        const grantHint = error.code === '42501' || /permission denied/i.test(error.message)
          ? ' Grant service_role access in Supabase SQL Editor, then rerun: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role; GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;'
          : '';
        throw new Error(`Could not import ${table}: ${error.message}.${grantHint}`);
      }
    }
    console.log(`${table}: ${rows.length} rows`);
  }
  const { error } = await supabase.rpc('sync_imported_sequences');
  if (error) throw new Error(`Content imported, but sequence sync failed: ${error.message}`);
  console.log('Import complete. Local admin credentials were not copied.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => db.close());
