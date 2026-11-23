import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileCode2,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  PenTool,
  Sparkles,
  Zap,
} from 'lucide-react';
import { api, type SubjectDetailResponse } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { CodeBlock, MarkdownRenderer } from '@/components/study/MarkdownRenderer';
import { DiagramGallery } from '@/components/study/DiagramGallery';
import { PdfViewerModal } from '@/components/study/PdfViewerModal';
import { QuestionCard } from '@/components/study/QuestionCard';
import {
  IMPORTANCE_META,
  RESOURCE_TYPE_LABELS,
  SOURCE_CATEGORY_LABELS,
  cn,
  formatBytes,
} from '@/lib/utils';
import type { Resource } from '@shared/types';

type SubjectTab =
  | 'overview'
  | 'syllabus'
  | 'exam_notes'
  | 'pdf_notes'
  | 'pyqs'
  | 'question_bank'
  | 'solved'
  | 'programs'
  | 'revision';

export function SubjectDetailPage() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<SubjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<SubjectTab>('overview');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [impFilter, setImpFilter] = useState<string>('all');
  const [qTypeFilter, setQTypeFilter] = useState<string>('all');
  const [pdfPreview, setPdfPreview] = useState<(Resource & { download_url?: string | null }) | null>(null);
  const showPreview = async (resource: Resource) => {
    try {
      const [previewUrl, dlUrl] = await Promise.all([
        api.resourceFileUrl(resource),
        api.resourceFileUrl(resource, true),
      ]);
      setPdfPreview({ ...resource, file_url: previewUrl, download_url: dlUrl });
    }
    catch (error) { console.error(error); }
  };

  const { isBookmarked, toggleBookmark, completedTopicIds } = useStudy();

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError('');
    setModuleFilter('all');
    api
      .getSubjectDetail(code)
      .then(setData)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [code]);

  const subjectTopicsCount = data?.topics.length || 0;
  const completedInSubject = useMemo(() => {
    if (!data) return 0;
    return data.topics.filter((t) => completedTopicIds.includes(t.id)).length;
  }, [data, completedTopicIds]);

  const progressPct =
    subjectTopicsCount > 0 ? Math.round((completedInSubject / subjectTopicsCount) * 100) : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <Card>
          <CardContent className="p-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Subject Not Found
            </h2>
            <p className="mt-1 text-sm text-slate-500">{error || 'Unable to load subject.'}</p>
            <Link to="/subjects" className="mt-4 inline-block">
              <Button variant="outline">Back to Subjects</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { subject, modules, topics, resources, questions, programs, revisionItems } = data;
  const bookmarkKey = `subject:${subject.code}`;
  const bookmarked = isBookmarked(bookmarkKey);

  const examNotes = resources.filter(
    (r) =>
      (r.resource_type === 'exam_notes' || r.resource_type === 'diagram') &&
      r.category !== 'Question Banks' &&
      (moduleFilter === 'all' || String(r.module_id) === moduleFilter) &&
      (impFilter === 'all' || r.importance === impFilter)
  );

  const libraryNotes = resources.filter(
    (r) =>
      ['handwritten_notes', 'original_notes', 'reference_notes'].includes(r.resource_type) &&
      (moduleFilter === 'all' || String(r.module_id) === moduleFilter)
  );

  const syllabusDocs = resources.filter((r) => r.resource_type === 'syllabus');
  const officialSyllabus = data.syllabus || syllabusDocs.find((r) => r.is_published) || null;
  const paperDocs = resources.filter((r) =>
    ['pyq', 'model_paper', 'solved_paper'].includes(r.resource_type)
  );
  const questionBankDocs = resources.filter((r) => r.category === 'Question Banks');

  const filteredQuestions = questions.filter(
    (q) =>
      (moduleFilter === 'all' || String(q.module_id) === moduleFilter) &&
      (impFilter === 'all' || q.importance === impFilter) &&
      (qTypeFilter === 'all' || q.question_type === qTypeFilter)
  );

  const solvedQuestions = filteredQuestions.filter((q) => q.is_solved && q.answer);
  const filteredPrograms = programs.filter(
    (p) => moduleFilter === 'all' || String(p.module_id) === moduleFilter
  );
  const filteredRevision = revisionItems.filter(
    (ri) => moduleFilter === 'all' || String(ri.module_id) === moduleFilter
  );

  const tabs: Array<{ id: SubjectTab; label: string; count?: number; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview & Modules', count: modules.length, icon: Layers },
    { id: 'syllabus', label: 'Official Syllabus', icon: FileText },
    { id: 'exam_notes', label: 'Exam Notes', count: resources.filter((r) => (r.resource_type === 'exam_notes' || r.resource_type === 'diagram') && r.category !== 'Question Banks').length, icon: Sparkles },
    { id: 'pdf_notes', label: 'Handwritten & KTU Notes', count: resources.filter((r) => ['handwritten_notes', 'original_notes', 'reference_notes'].includes(r.resource_type)).length, icon: PenTool },
    { id: 'pyqs', label: 'PYQs & Model Papers', count: paperDocs.length, icon: GraduationCap },
    { id: 'question_bank', label: 'Question Bank', count: questions.length + questionBankDocs.length, icon: HelpCircle },
    { id: 'solved', label: 'Solved Q&A', count: questions.filter((q) => q.is_solved).length, icon: CheckCircle2 },
    { id: 'programs', label: 'Programs / Problems', count: programs.length, icon: FileCode2 },
    { id: 'revision', label: 'Quick Revision', count: revisionItems.length, icon: Zap },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        to="/subjects"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to All Subjects
      </Link>

      {/* Subject Header */}
      <Card className="mt-3">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="indigo" className="font-mono font-semibold">
                  {subject.code}
                </Badge>
                <Badge variant="outline">{subject.scheme_name}</Badge>
                <Badge variant="outline">
                  {subject.branch_code} • {subject.semester_code}
                </Badge>
                <Badge variant="blue">{subject.course_type}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
                {subject.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {subject.short_description}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>Credits: <strong className="text-slate-800 dark:text-slate-200">{subject.credits}</strong></span>
                <span>• CIE: <strong className="text-slate-800 dark:text-slate-200">{subject.cie_marks}</strong></span>
                <span>• ESE: <strong className="text-slate-800 dark:text-slate-200">{subject.ese_marks}</strong></span>
                <span>• Modules: <strong className="text-slate-800 dark:text-slate-200">{modules.length}</strong></span>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col lg:items-end">
              <Button
                variant={bookmarked ? 'primary' : 'outline'}
                size="sm"
                onClick={() =>
                  toggleBookmark({
                    key: bookmarkKey,
                    kind: 'subject',
                    title: `${subject.code} — ${subject.name}`,
                    subtitle: `${subject.branch_code} ${subject.semester_code}`,
                    subjectCode: subject.code,
                    url: `/subjects/${subject.code}`,
                  })
                }
              >
                <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current')} />
                {bookmarked ? 'Subject Saved' : 'Bookmark Subject'}
              </Button>

              {subjectTopicsCount > 0 && (
                <div className="w-full min-w-[210px] rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Topic Progress
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {completedInSubject}/{subjectTopicsCount} ({progressPct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer',
              tab === t.id
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs dark:border-indigo-500 dark:bg-indigo-500'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                  tab === t.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Optional Module/Importance Filter Bar for resource tabs */}
      {['exam_notes', 'pdf_notes', 'question_bank', 'solved', 'programs', 'revision'].includes(tab) &&
        modules.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Filter:
            </span>
            <Select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-9 w-auto min-w-[180px] text-xs"
            >
              <option value="all">All Modules</option>
              {modules.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  Module {m.module_number}: {m.title}
                </option>
              ))}
            </Select>

            {['exam_notes', 'question_bank', 'solved'].includes(tab) && (
              <Select
                value={impFilter}
                onChange={(e) => setImpFilter(e.target.value)}
                className="h-9 w-auto min-w-[150px] text-xs"
              >
                <option value="all">All Importance Levels</option>
                <option value="must_study">Must Study</option>
                <option value="important">Important</option>
                <option value="additional">Additional</option>
              </Select>
            )}

            {['question_bank', 'solved'].includes(tab) && (
              <Select
                value={qTypeFilter}
                onChange={(e) => setQTypeFilter(e.target.value)}
                className="h-9 w-auto min-w-[160px] text-xs"
              >
                <option value="all">All Question Types</option>
                <option value="short_answer">Short Answer</option>
                <option value="descriptive">Descriptive</option>
                <option value="definition">Definition</option>
                <option value="programming">Programming</option>
                <option value="numerical">Numerical / Tracing</option>
                <option value="comparison">Comparison</option>
                <option value="diagram">Diagram-Based</option>
                <option value="problem_solving">Problem Solving</option>
              </Select>
            )}
          </div>
        )}

      {/* TAB CONTENT */}
      <div className="mt-5">
        {/* 1. OVERVIEW & MODULES */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {modules.map((m) => {
                const modTopics = topics.filter((t) => t.module_id === m.id);
                const doneModTopics = modTopics.filter((t) => completedTopicIds.includes(t.id)).length;
                return (
                  <Card
                    key={m.id}
                    className="hover:border-indigo-300 dark:hover:border-indigo-700"
                  >
                    <CardContent className="flex h-full flex-col justify-between p-5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="indigo">Module {m.module_number}</Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ~{m.estimated_hours} hrs
                          </span>
                        </div>
                        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                          {m.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {m.description}
                        </p>

                        {modTopics.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {modTopics.slice(0, 4).map((t) => (
                              <span
                                key={t.id}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {t.title}
                              </span>
                            ))}
                            {modTopics.length > 4 && (
                              <span className="text-[11px] text-slate-400">
                                +{modTopics.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {m.resource_count || 0} notes • {m.question_count || 0} Qs
                          {modTopics.length > 0 && ` • ${doneModTopics}/${modTopics.length} done`}
                        </div>
                        <Link to={`/subjects/${subject.code}/module/${m.module_number}`}>
                          <Button size="sm">
                            Study Module <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {resources.length === 0 && questions.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-indigo-500" />
                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    Syllabus Configured — Ready for Study Resources
                  </h3>
                  <p className="mx-auto mt-1 max-w-lg text-xs text-slate-500 dark:text-slate-400">
                    The official KTU 2024 Scheme module structure for <strong>{subject.code}</strong> is
                    ready. Simplified notes, handwritten PDFs, PYQs, and question banks can be added
                    directly through the Admin CMS without any code changes.
                  </p>
                  <Link to="/admin" className="mt-4 inline-block">
                    <Button size="sm" variant="outline">
                      Open Admin CMS
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 2. OFFICIAL SYLLABUS */}
        {tab === 'syllabus' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge variant="emerald">Official KTU 2024 Scheme Outline</Badge>
                    <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                      {subject.code} — {subject.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {subject.syllabus_summary}
                    </p>
                  </div>
                  {officialSyllabus ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => { const legacy = !('file_path' in officialSyllabus) || !officialSyllabus.file_path; const [url, dlUrl] = legacy ? await Promise.all([api.resourceFileUrl(officialSyllabus as Resource), api.resourceFileUrl(officialSyllabus as Resource, true)]) : await Promise.all([api.syllabusUrl(officialSyllabus.file_path!), api.syllabusUrl(officialSyllabus.file_path!, true)]); setPdfPreview({ ...(syllabusDocs[0] || {} as Resource), id: -1, subject_id: subject.id, title: officialSyllabus.title || 'Official Syllabus', description: officialSyllabus.description || '', resource_type: 'syllabus', source_category: 'official_document', importance: 'important', content_format: 'pdf', file_url: url, download_url: dlUrl, file_name: officialSyllabus.file_name, file_size_bytes: officialSyllabus.file_size_bytes, mime_type: 'application/pdf' }); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview Syllabus PDF
                      </Button>
                      <a
                        href="#official-syllabus-download"
                        onClick={async (e) => { e.preventDefault(); const legacy = !('file_path' in officialSyllabus) || !officialSyllabus.file_path; const url = legacy ? await api.resourceFileUrl(officialSyllabus as Resource, true) : await api.syllabusUrl(officialSyllabus.file_path!, true); if (url) window.open(url, '_blank', 'noopener'); }}
                      >
                        <Button size="sm">
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </a>
                    </div>
                  ) : <Badge variant="outline">Official syllabus PDF not uploaded yet</Badge>}
                </div>
              </CardContent>
            </Card>

            {modules.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Module {m.module_number}: {m.title}
                    </h3>
                    <Link
                      to={`/subjects/${subject.code}/module/${m.module_number}`}
                      className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Open Module →
                    </Link>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {m.syllabus_text || m.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 3. EXAM-FRIENDLY NOTES */}
        {tab === 'exam_notes' && (
          <div className="space-y-4">
            {examNotes.length === 0 ? (
              <EmptySubjectState label="Exam-Friendly Notes" subjectCode={subject.code} />
            ) : (
              examNotes.map((res) => (
                <Card key={res.id}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        {res.module_number && (
                          <Badge variant="indigo">Module {res.module_number}</Badge>
                        )}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleBookmark({
                            key: `resource:${res.id}`,
                            kind: 'resource',
                            title: res.title,
                            subtitle: `${subject.code} • ${RESOURCE_TYPE_LABELS[res.resource_type]}`,
                            subjectCode: subject.code,
                            url: `/subjects/${subject.code}`,
                          })
                        }
                      >
                        <Bookmark
                          className={cn(
                            'h-4 w-4',
                            isBookmarked(`resource:${res.id}`) && 'fill-indigo-600 text-indigo-600'
                          )}
                        />
                      </Button>
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                      {res.title}
                    </h3>
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
              ))
            )}
          </div>
        )}

        {/* 4. HANDWRITTEN / ORIGINAL / REFERENCE PDF NOTES */}
        {tab === 'pdf_notes' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {libraryNotes.length === 0 ? (
              <div className="sm:col-span-2">
                <EmptySubjectState
                  label="Handwritten & KTU Notes"
                  subjectCode={subject.code}
                />
              </div>
            ) : (
              libraryNotes.map((doc) => (
                <ResourceFileCard
                  key={doc.id}
                  resource={doc}
                  onPreview={() => showPreview(doc)}
                />
              ))
            )}
          </div>
        )}

        {/* 5. PYQS & MODEL PAPERS */}
        {tab === 'pyqs' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {paperDocs.length === 0 ? (
              <div className="sm:col-span-2">
                <EmptySubjectState
                  label="PYQs & Model Question Papers"
                  subjectCode={subject.code}
                />
              </div>
            ) : (
              paperDocs.map((doc) => (
                <ResourceFileCard
                  key={doc.id}
                  resource={doc}
                  onPreview={() => showPreview(doc)}
                />
              ))
            )}
          </div>
        )}

        {/* 6. QUESTION BANK */}
        {tab === 'question_bank' && (
          <div className="space-y-6">
            {questionBankDocs.length > 0 && (
              <section>
                <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
                  Uploaded Question Bank PDFs ({questionBankDocs.length})
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {questionBankDocs.map((doc) => (
                    <ResourceFileCard key={doc.id} resource={doc} onPreview={() => showPreview(doc)} />
                  ))}
                </div>
              </section>
            )}
            <section className="space-y-3">
              {filteredQuestions.length === 0 && questionBankDocs.length === 0 ? (
                <EmptySubjectState label="Question Bank" subjectCode={subject.code} />
              ) : filteredQuestions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No structured questions are available for this subject yet.
                </p>
              ) : (
                filteredQuestions.map((q) => <QuestionCard key={q.id} question={q} />)
              )}
            </section>
          </div>
        )}

        {/* 7. SOLVED QUESTIONS */}
        {tab === 'solved' && (
          <div className="space-y-3">
            {solvedQuestions.length === 0 ? (
              <EmptySubjectState label="Solved Questions" subjectCode={subject.code} />
            ) : (
              solvedQuestions.map((q) => (
                <QuestionCard key={q.id} question={q} defaultRevealed />
              ))
            )}
          </div>
        )}

        {/* 8. PROGRAMS / NUMERICALS */}
        {tab === 'programs' && (
          <div className="space-y-4">
            {filteredPrograms.length === 0 ? (
              <EmptySubjectState
                label="Programming / Numerical Examples"
                subjectCode={subject.code}
              />
            ) : (
              filteredPrograms.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {p.module_number && (
                          <Badge variant="indigo">Module {p.module_number}</Badge>
                        )}
                        <Badge variant="blue" className="uppercase">
                          {p.language}
                        </Badge>
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            IMPORTANCE_META[p.importance].className
                          )}
                        >
                          {IMPORTANCE_META[p.importance].label}
                        </span>
                      </div>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {p.problem_statement}
                    </p>
                    <CodeBlock code={p.code} language={p.language} />
                    {(p.sample_input || p.sample_output) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {p.sample_input && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              Sample Input
                            </div>
                            <pre className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                              {p.sample_input}
                            </pre>
                          </div>
                        )}
                        {p.sample_output && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              Sample Output
                            </div>
                            <pre className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                              {p.sample_output}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                    {p.explanation && (
                      <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white">Explanation: </strong>
                        {p.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* 9. QUICK REVISION */}
        {tab === 'revision' && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredRevision.length === 0 ? (
              <div className="md:col-span-2">
                <EmptySubjectState label="Quick Revision" subjectCode={subject.code} />
              </div>
            ) : (
              filteredRevision.map((ri) => (
                <Card key={ri.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {ri.module_number && (
                        <Badge variant="indigo">Module {ri.module_number}</Badge>
                      )}
                      <Badge variant="blue" className="capitalize">
                        {ri.category}
                      </Badge>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          IMPORTANCE_META[ri.importance].className
                        )}
                      >
                        {IMPORTANCE_META[ri.importance].label}
                      </span>
                    </div>
                    <h3 className="mt-2.5 text-base font-bold text-slate-900 dark:text-white">
                      {ri.title}
                    </h3>
                    <div className="mt-2">
                      <MarkdownRenderer content={ri.content_markdown} />
                    </div>
                    {ri.code_snippet && <CodeBlock code={ri.code_snippet} language="java" />}
                    {ri.diagram_key && (
                      <div className="mt-3">
                        <DiagramGallery diagramKey={ri.diagram_key} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <PdfViewerModal
        open={Boolean(pdfPreview)}
        onClose={() => setPdfPreview(null)}
        title={pdfPreview?.title || ''}
        fileUrl={pdfPreview?.file_url || null}
        downloadUrl={pdfPreview?.download_url}
        fileName={pdfPreview?.file_name}
        fileSizeBytes={pdfPreview?.file_size_bytes}
      />
    </div>
  );
}

export function ResourceFileCard({
  resource,
  onPreview,
}: {
  resource: Resource;
  onPreview: (url?: string, downloadUrl?: string) => void;
}) {
  const { isBookmarked, toggleBookmark } = useStudy();
  const bKey = `resource:${resource.id}`;
  const bookmarked = isBookmarked(bKey);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(resource.file_url);
  useEffect(() => { let active = true; api.resourceFileUrl(resource, true).then((url) => { if (active) setDownloadUrl(url); }).catch(() => {}); return () => { active = false; }; }, [resource.id, resource.file_path, resource.file_url]);

  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {resource.subject_code && <Badge variant="indigo">{resource.subject_code}</Badge>}
              <Badge variant="blue">{resource.category || RESOURCE_TYPE_LABELS[resource.resource_type]}</Badge>
              {resource.module_number && (
                <Badge variant="outline">Module {resource.module_number}</Badge>
              )}
              {resource.exam_type && (
                <Badge variant="amber" className="capitalize">
                  {resource.exam_type}
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                toggleBookmark({
                  key: bKey,
                  kind: 'resource',
                  title: resource.title,
                  subtitle: `${resource.subject_code || ''} • ${RESOURCE_TYPE_LABELS[resource.resource_type]}`,
                  subjectCode: resource.subject_code || '',
                  url: resource.subject_code ? `/subjects/${resource.subject_code}` : '/notes',
                })
              }
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-indigo-600 text-indigo-600')} />
            </button>
          </div>

          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            {resource.title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {resource.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Source: {SOURCE_CATEGORY_LABELS[resource.source_category]}</span>
            {resource.file_size_bytes && <span>• {formatBytes(resource.file_size_bytes)}</span>}
            {resource.exam_year && <span>• {resource.exam_year}</span>}
          </div>
        </div>

        {(resource.file_url || resource.file_path) && (
          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800">
            <Button size="sm" variant="outline" className="flex-1" onClick={async () => { try { onPreview((await api.resourceFileUrl(resource)) || undefined, downloadUrl || undefined); } catch (error) { console.error(error); } }}>
              <Eye className="h-3.5 w-3.5" />
              Preview PDF
            </Button>
            <a
              href={downloadUrl || undefined}
              download={resource.file_name || 'resource.pdf'}
              className="flex-1"
            >
              <Button size="sm" className="w-full">
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptySubjectState({ label, subjectCode }: { label: string; subjectCode: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No {label} uploaded yet for {subjectCode}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Resources are strictly isolated per subject. You can publish {label.toLowerCase()} for{' '}
          {subjectCode} anytime from the Admin Dashboard.
        </p>
      </CardContent>
    </Card>
  );
}
