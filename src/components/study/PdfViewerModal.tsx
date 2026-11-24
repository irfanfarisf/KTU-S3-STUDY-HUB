import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils';

interface PdfViewerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string | null;
  downloadUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
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
}: PdfViewerModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [fileUrl, open]);

  if (!fileUrl) return null;
  const downloadUrl = explicitDownloadUrl
    || (fileUrl.includes('token=')
      ? fileUrl
      : fileUrl.includes('?')
        ? `${fileUrl}&download=1`
        : `${fileUrl}?download=1`);
  const isImage = Boolean(mimeType?.startsWith('image/'));
  const isPdf = mimeType === 'application/pdf' || (!mimeType && (!fileName || fileName.toLowerCase().endsWith('.pdf')));

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
          <div className="flex items-center gap-2">
            {(isImage || isPdf) && <a href={fileUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
                Open New Tab
              </Button>
            </a>}
            <a href={downloadUrl} download={fileName || 'resource'}>
              <Button variant="primary" size="sm">
                <Download className="h-3.5 w-3.5" />
                Download file
              </Button>
            </a>
          </div>
        </div>

        {isImage ? (
          imgError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Image preview could not be loaded (the temporary link may have expired or the file may be missing). Try closing and reopening preview, or use Download file.
            </div>
          ) : (
            <div className="flex max-h-[68vh] w-full items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950">
              <img src={fileUrl} alt={title} onError={() => setImgError(true)} className="max-h-[64vh] max-w-full object-contain" />
            </div>
          )
        ) : isPdf ? (
          <div className="h-[68vh] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
            <iframe src={fileUrl} title={title} className="h-full w-full" />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            Inline preview is not available for this document type. Use Download file to open it in a compatible app.
          </div>
        )}
      </div>
    </Modal>
  );
}
