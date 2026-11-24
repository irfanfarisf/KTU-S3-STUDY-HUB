import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, Info } from 'lucide-react';
import type { Resource, Subject } from '@shared/types';
import { api } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { PdfViewerModal } from '@/components/study/PdfViewerModal';
import { ResourceFileCard } from '@/pages/SubjectDetailPage';

export function PyqLibraryPage() {
  const { selection } = useStudy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfPreview, setPdfPreview] = useState<Resource | null>(null);

  const subjectFilter = searchParams.get('subject') || 'all';
  const examTypeFilter = searchParams.get('examType') || 'all';

  useEffect(() => {
    api
      .getSubjects({
        universityId: selection.universityId,
        schemeId: selection.schemeId,
        branchId: selection.branchId,
        semesterId: selection.semesterId,
      })
      .then(setSubjects)
      .catch(console.error);
  }, [selection]);

  useEffect(() => {
    setLoading(true);
    api
      .getResources({
        subjectId: subjectFilter !== 'all' ? Number(subjectFilter) : undefined,
        resourceType: 'pyq,model_paper,solved_paper',
        examType: examTypeFilter !== 'all' ? examTypeFilter : undefined,
        schemeId: selection.schemeId,
        branchId: selection.branchId,
        semesterId: selection.semesterId,
      })
      .then(setPapers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectFilter, examTypeFilter, selection.schemeId, selection.branchId, selection.semesterId]);

  const setFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all') next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <GraduationCap className="h-3.5 w-3.5" />
          Central Examination Archive
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          PYQ &amp; Model Question Paper Library
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organized by subject, subject code, scheme, semester, academic year, and exam type.
        </p>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <span>
          <strong>Content Transparency:</strong> Official university past papers and practice model
          papers are strictly separated and labeled. No synthetic or fabricated exam dates are used.
          Admins can upload official KTU Regular/Supplementary PDFs anytime via the Admin CMS.
        </span>
      </div>

      <Card className="mt-5">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Filter by Subject / Code
            </label>
            <Select
              value={subjectFilter}
              onChange={(e) => setFilter('subject', e.target.value)}
            >
              <option value="all">All Subjects in Scope</option>
              {subjects.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Examination Type
            </label>
            <Select
              value={examTypeFilter}
              onChange={(e) => setFilter('examType', e.target.value)}
            >
              <option value="all">All Exam Types</option>
              <option value="regular">Regular Examination</option>
              <option value="supplementary">Supplementary Examination</option>
              <option value="model">Model Examination / Sample</option>
              <option value="verified">Other Verified Paper</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : papers.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            No examination papers match these filters yet. Upload verified PYQs in the Admin
            Dashboard.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((doc) => (
            <ResourceFileCard key={doc.id} resource={doc} onPreview={(url, downloadUrl) => setPdfPreview({ ...doc, file_url: url || doc.file_url, download_url: downloadUrl })} />
          ))}
        </div>
      )}

      <PdfViewerModal
        open={Boolean(pdfPreview)}
        onClose={() => setPdfPreview(null)}
        title={pdfPreview?.title || ''}
        fileUrl={pdfPreview?.file_url || null}
        downloadUrl={pdfPreview?.download_url}
        fileName={pdfPreview?.file_name}
        fileSizeBytes={pdfPreview?.file_size_bytes}
        mimeType={pdfPreview?.mime_type}
      />
    </div>
  );
}
