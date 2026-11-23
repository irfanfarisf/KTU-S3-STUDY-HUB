import React from 'react';
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
}

export function PdfViewerModal({
  open,
  onClose,
  title,
  fileUrl,
  downloadUrl: explicitDownloadUrl,
  fileName,
  fileSizeBytes,
}: PdfViewerModalProps) {
  if (!fileUrl) return null;
  const downloadUrl = explicitDownloadUrl
    || (fileUrl.includes('token=')
      ? fileUrl
      : fileUrl.includes('?')
        ? `${fileUrl}&download=1`
        : `${fileUrl}?download=1`);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`${fileName || 'Document.pdf'} • ${formatBytes(fileSizeBytes)}`}
      maxWidthClass="max-w-5xl"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Inline PDF Preview (use Open New Tab on mobile if embedded scroll is restricted)</span>
          </div>
          <div className="flex items-center gap-2">
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
                Open New Tab
              </Button>
            </a>
            <a href={downloadUrl} download={fileName || 'resource.pdf'}>
              <Button variant="primary" size="sm">
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </Button>
            </a>
          </div>
        </div>

        <div className="h-[68vh] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
          <iframe
            src={fileUrl}
            title={title}
            className="h-full w-full"
          />
        </div>
      </div>
    </Modal>
  );
}
