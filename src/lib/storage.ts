import { getSupabase } from '@/lib/supabase';

export const STUDY_RESOURCES_BUCKET = 'study-resources';
export const PENDING_SUBMISSIONS_BUCKET = 'pending-submissions';
export const SIGNED_URL_TTL_SECONDS = 3600;
export const MAX_RESOURCE_FILE_BYTES = 25 * 1024 * 1024;

export const RESOURCE_EXT_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const ADMIN_EXTRA_EXT_MIME_MAP: Record<string, string> = {
  ...RESOURCE_EXT_MIME_MAP,
  txt: 'text/plain',
  md: 'text/markdown',
};

export type FilePreviewKind = 'image' | 'pdf' | 'doc' | 'other';

/**
 * Extracts a lowercase file extension (handling filenames with multiple dots).
 */
export function getFileExtension(fileName?: string | null): string {
  if (!fileName) return '';
  const trimmed = fileName.trim();
  const dotIdx = trimmed.lastIndexOf('.');
  if (dotIdx <= 0 || dotIdx === trimmed.length - 1) return '';
  return trimmed.slice(dotIdx + 1).toLowerCase();
}

/**
 * Validates and normalizes the MIME type for an uploaded file.
 */
export function resolveResourceMimeType(file: File, allowText = false): string {
  const map = allowText ? ADMIN_EXTRA_EXT_MIME_MAP : RESOURCE_EXT_MIME_MAP;
  const ext = getFileExtension(file.name);
  const canonical = map[ext];
  if (!canonical) {
    throw new Error(
      allowText
        ? 'Choose a valid PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP, TXT, or MD file.'
        : 'Choose a valid PDF, DOC, DOCX, JPG, JPEG, PNG, or WEBP file.'
    );
  }
  const reported = (file.type || '').toLowerCase();
  const compatible =
    !reported ||
    reported === canonical ||
    reported === 'application/octet-stream' ||
    (ext === 'pdf' && reported === 'application/x-pdf') ||
    ((ext === 'jpg' || ext === 'jpeg') && (reported === 'image/pjpeg' || reported === 'image/jpg'));
  if (!compatible) {
    throw new Error(
      allowText
        ? 'File content type does not match its extension. Choose a valid PDF, DOC, DOCX, image, or text file.'
        : 'File content type does not match its extension. Choose a valid PDF, DOC, DOCX, JPG, JPEG, PNG, or WEBP file.'
    );
  }
  return canonical;
}

/**
 * Builds a deterministic, storage-safe object key preserving extension and multiple dots.
 */
export function buildStorageObjectPath(originalFileName: string, prefix?: string): string {
  const ext = getFileExtension(originalFileName);
  const rawBase = ext
    ? originalFileName.slice(0, originalFileName.length - (ext.length + 1))
    : originalFileName;
  const cleanBase = rawBase
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80) || 'resource';
  const filePart = `${crypto.randomUUID()}-${cleanBase}${ext ? `.${ext}` : ''}`;
  const cleanPrefix = prefix ? normalizeStoragePath(prefix).replace(/\/+$/, '') : '';
  return cleanPrefix ? `${cleanPrefix}/${filePart}` : filePart;
}

/**
 * Normalizes a stored object path without mutating internal slashes or valid characters.
 */
export function normalizeStoragePath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

/**
 * Detects temporary browser/local/expiring URLs that must never be treated as permanent storage references.
 */
export function isInvalidPermanentUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('/api/files/') ||
    /^[A-Za-z]:[\\/]/.test(trimmed) ||
    trimmed.includes('/storage/v1/object/sign/')
  );
}

/**
 * Extracts bucket and object path from a legacy Supabase Storage URL when present.
 */
export function extractSupabaseStorageRef(fileUrl?: string | null): { bucket: string; path: string } | null {
  if (!fileUrl) return null;
  const match = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/);
  if (!match) return null;
  const bucket = match[1];
  const rawPath = match[2];
  try {
    return { bucket, path: normalizeStoragePath(decodeURIComponent(rawPath)) };
  } catch {
    return { bucket, path: normalizeStoragePath(rawPath) };
  }
}

/**
 * Maps raw Supabase Storage errors into clear, actionable messages.
 */
export function formatStorageError(
  err: unknown,
  context?: { fileName?: string | null; bucket?: string | null }
): string {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown storage error');
  const label = context?.fileName ? ` "${context.fileName}"` : '';
  if (/object not found|nosuchkey/i.test(raw)) {
    return `The file${label} is currently unavailable in storage. Please refresh the page and try again, or ask an admin to re-upload it.`;
  }
  if (/bucket not found|nosuchbucket/i.test(raw)) {
    return `Storage bucket${context?.bucket ? ` "${context.bucket}"` : ''} is unavailable or misconfigured.`;
  }
  if (/jwt|expired|token|unauthorized|row-level security/i.test(raw)) {
    return `Access to${label || ' this file'} expired or was denied. Please try again to generate a fresh link.`;
  }
  return raw;
}

/**
 * Generates a fresh signed URL for a stored object in the specified bucket.
 */
export async function createFreshSignedUrl(options: {
  bucket?: string | null;
  path: string;
  downloadFileName?: string | boolean;
  fileNameForError?: string | null;
  expiresIn?: number;
}): Promise<string> {
  const bucket = options.bucket?.trim() || STUDY_RESOURCES_BUCKET;
  const path = normalizeStoragePath(options.path);
  if (!path) {
    throw new Error('This resource does not have a valid storage file path.');
  }
  const downloadOpt =
    options.downloadFileName === true
      ? true
      : typeof options.downloadFileName === 'string' && options.downloadFileName.trim()
        ? options.downloadFileName.trim()
        : undefined;
  const { data, error } = await getSupabase()
    .storage.from(bucket)
    .createSignedUrl(path, options.expiresIn ?? SIGNED_URL_TTL_SECONDS, {
      download: downloadOpt,
    });
  if (error || !data?.signedUrl) {
    throw new Error(formatStorageError(error || new Error('Could not generate file link.'), {
      fileName: options.fileNameForError || (typeof options.downloadFileName === 'string' ? options.downloadFileName : null),
      bucket,
    }));
  }
  return data.signedUrl;
}

/**
 * Classifies a file for inline preview vs download-only handling.
 */
export function getFilePreviewKind(mimeType?: string | null, fileName?: string | null): FilePreviewKind {
  const mime = (mimeType || '').toLowerCase();
  const ext = getFileExtension(fileName);
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || mime === 'application/x-pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    ext === 'doc' ||
    ext === 'docx' ||
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'doc';
  }
  if (!mime && !ext) {
    return 'pdf';
  }
  return 'other';
}

/**
 * Triggers a direct browser download without opening blocked popups on mobile.
 */
export function triggerBrowserDownload(url: string, fileName?: string | null): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'resource';
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
