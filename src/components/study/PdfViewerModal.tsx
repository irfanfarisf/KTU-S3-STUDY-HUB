import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Download, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils';
import { getFilePreviewKind, triggerBrowserDownload } from '@/lib/storage';

interface PdfViewerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string | null;
  downloadUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  onRefreshUrl?: () => Promise<{ fileUrl: string; downloadUrl: string | null } | null>;
}

export function PdfViewerModal({
  open,
  onClose,
  title,
  fileUrl,
  downloadUrl: explicitDownloadUrl,
  fileName,
  fileSizeBytes,
  mimeType,
  onRefreshUrl,
}: PdfViewerModalProps) {
  const [activeFileUrl, setActiveFileUrl] = useState<string | null>(fileUrl);
  const [activeDownloadUrl, setActiveDownloadUrl] = useState<string | null>(explicitDownloadUrl ?? null);
  const [imgError, setImgError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState('');
  const retriedRef = useRef(false);

  useEffect(() => {
    setActiveFileUrl(fileUrl);
    setActiveDownloadUrl(explicitDownloadUrl ?? null);
    setImgError(false);
    setActionError('');
    retriedRef.current = false;
  }, [fileUrl, explicitDownloadUrl, open]);

  const handleRefresh = useCallback(async () => {
    if (!onRefreshUrl) return null;
    setRefreshing(true);
    setActionError('');
    try {
      const next = await onRefreshUrl();
      if (!next?.fileUrl) {
        throw new Error('Could not obtain a fresh file link.');
      }
      setActiveFileUrl(next.fileUrl);
      setActiveDownloadUrl(next.downloadUrl);
      setImgError(false);
      return next;
    } catch (err) {
      setActionError((err as Error).message || 'Could not refresh the file link.');
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshUrl]);

  const handleImageError = async () => {
    if (onRefreshUrl && !retriedRef.current) {
      retriedRef.current = true;
      const refreshed = await handleRefresh();
      if (refreshed?.fileUrl) return;
    }
    setImgError(true);
  };

  if (!activeFileUrl) return null;

  const fallbackDownloadUrl =
    activeDownloadUrl ||
    (activeFileUrl.includes('token=')
      ? activeFileUrl
      : activeFileUrl.includes('?')
        ? `${activeFileUrl}&download=1`
        : `${activeFileUrl}?download=1`);

  const previewKind = getFilePreviewKind(mimeType, fileName);
  const isImage = previewKind === 'image';
  const isPdf = previewKind === 'pdf';

  const handleDownloadClick = async () => {
    setActionError('');
    setDownloading(true);
    try {
      if (onRefreshUrl) {
        const fresh = await onRefreshUrl();
        const urlToUse = fresh?.downloadUrl || fresh?.fileUrl || fallbackDownloadUrl;
        if (fresh?.fileUrl) {
          setActiveFileUrl(fresh.fileUrl);
          setActiveDownloadUrl(fresh.downloadUrl);
        }
        triggerBrowserDownload(urlToUse, fileName);
      } else {
        triggerBrowserDownload(fallbackDownloadUrl, fileName);
      }
    } catch (err) {
      setActionError((err as Error).message || 'Could not download this file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`${fileName || 'Document'} • ${formatBytes(fileSizeBytes)}`}
      maxWidthClass="max-w-5xl"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>{isImage ? 'Image preview' : isPdf ? 'PDF preview' : 'Document download'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onRefreshUrl && (
              <Button variant="ghost" size="sm" disabled={refreshing} onClick={() => void handleRefresh()}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh link'}
              </Button>
            )}
            {(isImage || isPdf) && (
              <a href={activeFileUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open New Tab
                </Button>
              </a>
            )}
            <Button variant="primary" size="sm" disabled={downloading} onClick={() => void handleDownloadClick()}>
              <Download className="h-3.5 w-3.5" />
              {downloading ? 'Preparing…' : 'Download file'}
            </Button>
          </div>
        </div>

        {actionError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {isImage ? (
          imgError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <p>Image preview could not be loaded. The link may have expired or the file may be unavailable in storage.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {onRefreshUrl && (
                  <Button size="sm" variant="outline" disabled={refreshing} onClick={() => void handleRefresh()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try Fresh Link
                  </Button>
                )}
                <Button size="sm" disabled={downloading} onClick={() => void handleDownloadClick()}>
                  <Download className="h-3.5 w-3.5" />
                  Download file
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex max-h-[68vh] w-full items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950">
              <img
                src={activeFileUrl}
                alt={title}
                onError={() => void handleImageError()}
                className="max-h-[64vh] max-w-full object-contain"
              />
            </div>
          )
        ) : isPdf ? (
          <div className="space-y-2">
            <div className="h-[68vh] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
              <iframe src={activeFileUrl} title={title} className="h-full w-full" />
            </div>
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
              On mobile browsers where inline PDF scrolling is limited, use <strong>Open New Tab</strong> or <strong>Download file</strong>.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            Inline preview is not available for Word documents ({fileName || 'DOC/DOCX'}). Use <strong>Download file</strong> to save it in its original format.
          </div>
        )}
      </div>
    </Modal>
  );
}
