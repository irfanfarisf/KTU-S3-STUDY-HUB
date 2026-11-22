import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Sparkles } from 'lucide-react';
import type { Resource, Subject } from '@shared/types';
import { api } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { MarkdownRenderer } from '@/components/study/MarkdownRenderer';
import { DiagramGallery } from '@/components/study/DiagramGallery';
import { PdfViewerModal } from '@/components/study/PdfViewerModal';
import { ResourceFileCard } from '@/pages/SubjectDetailPage';
import { IMPORTANCE_META, RESOURCE_TYPE_LABELS, SOURCE_CATEGORY_LABELS, cn } from '@/lib/utils';

export function NotesLibraryPage() {
  const { selection } = useStudy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfPreview, setPdfPreview] = useState<Resource | null>(null);

  const subjectFilter = searchParams.get('subject') || 'all';
  const typeFilter = searchParams.get('type') || 'all_notes';
  const impFilter = searchParams.get('importance') || 'all';

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
    const resourceTypeParam =
      typeFilter === 'all_notes'
        ? 'exam_notes,original_notes,handwritten_notes,reference_notes,syllabus,diagram'
        : typeFilter;
    const filters = {
      subjectId: subjectFilter !== 'all' ? Number(subjectFilter) : undefined,
      importance: impFilter !== 'all' ? impFilter : undefined,
      schemeId: selection.schemeId,
      semesterId: selection.semesterId,
    };
    const resourceTypes = resourceTypeParam.split(',');
    Promise.all([
      api.getResources({ ...filters, resourceType: resourceTypeParam }),
      resourceTypes.includes('syllabus') ? api.getSyllabi(filters) : Promise.resolve([]),
    ])
      .then(([resourceRows, syllabi]) =>
        setResources([
          ...syllabi,
          ...resourceRows.filter((resource) => resource.category !== 'Question Banks'),
        ])
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectFilter, typeFilter, impFilter, selection.schemeId, selection.semesterId]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all' || val === 'all_notes') next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  const pdfResources = resources.filter((r) => r.file_url || r.file_path);
  const markdownResources = resources.filter((r) => !r.file_url && !r.file_path && r.content_markdown);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <FileText className="h-3.5 w-3.5" />
          Central Notes &amp; Syllabus Library
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Notes, Handwritten PDFs &amp; Syllabus
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Browse simplified exam-friendly notes, classroom reference PDFs, handwritten sheets, and
          syllabus outlines.
        </p>
      </div>

      {/* Filters */}
      <Card className="mt-5">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Subject
            </label>
            <Select
              value={subjectFilter}
              onChange={(e) => updateParam('subject', e.target.value)}
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
              Resource Library
            </label>
            <Select value={typeFilter} onChange={(e) => updateParam('type', e.target.value)}>
              <option value="all_notes">All Notes &amp; Syllabus</option>
              <option value="exam_notes">Simplified Exam-Friendly Notes</option>
              <option value="handwritten_notes,original_notes">Handwritten &amp; KTU Notes</option>
              <option value="handwritten_notes">Handwritten Notes Only</option>
              <option value="original_notes">KTU Notes Only</option>
              <option value="reference_notes">Reference Notes</option>
              <option value="syllabus">Official Syllabus</option>
              <option value="diagram">Diagrams</option>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Importance Level
            </label>
            <Select
              value={impFilter}
              onChange={(e) => updateParam('importance', e.target.value)}
            >
              <option value="all">All Levels</option>
              <option value="must_study">Must Study</option>
              <option value="important">Important</option>
              <option value="additional">Additional</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="mt-6 h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : resources.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            No notes match the selected filters yet.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-8">
          {pdfResources.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
                PDF Documents ({pdfResources.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pdfResources.map((doc) => (
                  <ResourceFileCard
                    key={doc.id}
                    resource={doc}
                    onPreview={(url) => setPdfPreview({ ...doc, file_url: url || doc.file_url })}
                  />
                ))}
              </div>
            </section>
          )}

          {markdownResources.length > 0 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Simplified Exam-Friendly Study Notes ({markdownResources.length})
              </h2>
              {markdownResources.map((res) => (
                <Card key={res.id}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {res.subject_code && <Badge variant="indigo">{res.subject_code}</Badge>}
                      {res.module_number && <Badge variant="outline">Module {res.module_number}</Badge>}
                      <Badge variant="blue">{RESOURCE_TYPE_LABELS[res.resource_type]}</Badge>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          IMPORTANCE_META[res.importance].className
                        )}
                      >
                        {IMPORTANCE_META[res.importance].label}
                      </span>
                      <Badge variant="outline">
                        {SOURCE_CATEGORY_LABELS[res.source_category]}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{res.title}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {res.description}
                    </p>
                    {res.diagram_key && (
                      <div className="mt-4">
                        <DiagramGallery diagramKey={res.diagram_key} />
                      </div>
                    )}
                    {res.content_markdown && (
                      <div className="mt-4">
                        <MarkdownRenderer content={res.content_markdown} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </div>
      )}

      <PdfViewerModal
        open={Boolean(pdfPreview)}
        onClose={() => setPdfPreview(null)}
        title={pdfPreview?.title || ''}
        fileUrl={pdfPreview?.file_url || null}
        fileName={pdfPreview?.file_name}
        fileSizeBytes={pdfPreview?.file_size_bytes}
      />
    </div>
  );
}
