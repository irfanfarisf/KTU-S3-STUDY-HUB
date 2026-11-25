import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Circle,
  FileCode2,
  FileText,
  GraduationCap,
  HelpCircle,
  PenTool,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import type { Resource } from '@shared/types';
import { api, type ModuleDetailResponse } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CodeBlock, MarkdownRenderer } from '@/components/study/MarkdownRenderer';
import { DiagramGallery } from '@/components/study/DiagramGallery';
import { PdfViewerModal } from '@/components/study/PdfViewerModal';
import { QuestionCard } from '@/components/study/QuestionCard';
import { ResourceFileCard } from '@/pages/SubjectDetailPage';
import { IMPORTANCE_META, cn } from '@/lib/utils';

export function ModuleDetailPage() {
  const { code, moduleNumber } = useParams<{ code: string; moduleNumber: string }>();
  const [data, setData] = useState<ModuleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfPreview, setPdfPreview] = useState<Resource | null>(null);

  const { completedTopicIds, toggleTopicComplete, isBookmarked, toggleBookmark } = useStudy();

  useEffect(() => {
    if (!code || !moduleNumber) return;
    setLoading(true);
    setError('');
    api
      .getModuleDetail(code, Number(moduleNumber))
      .then(setData)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [code, moduleNumber]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <Card>
          <CardContent className="p-8">
            <h2 className="text-lg font-bold">Module Not Found</h2>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <Link to={code ? `/subjects/${code}` : '/subjects'} className="mt-4 inline-block">
              <Button variant="outline">Back to Subject</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    subject,
    module,
    allModules,
    topics,
    resources,
    subjectLevelPapers,
    questions,
    programs,
    revisionItems,
  } = data;

  const examNotes = resources.filter(
    (r) => (r.resource_type === 'exam_notes' || r.resource_type === 'diagram') && r.category !== 'Question Banks'
  );
  const questionBankDocs = resources.filter((r) => r.category === 'Question Banks');
  const originalNotes = resources.filter(
    (r) => r.resource_type === 'original_notes' || r.resource_type === 'reference_notes'
  );
  const handwrittenNotes = resources.filter((r) => r.resource_type === 'handwritten_notes');
  const modulePyqs = resources.filter((r) =>
    ['pyq', 'model_paper', 'solved_paper'].includes(r.resource_type)
  );
  const importantQuestions = questions.filter(
    (q) => q.is_important || q.importance === 'must_study'
  );
  const solvedQuestions = questions.filter((q) => q.is_solved && q.answer);

  const completedTopicsCount = topics.filter((t) => completedTopicIds.includes(t.id)).length;
  const modPct = topics.length > 0 ? Math.round((completedTopicsCount / topics.length) * 100) : 0;

  const currentIdx = allModules.findIndex((m) => m.module_number === module.module_number);
  const prevMod = currentIdx > 0 ? allModules[currentIdx - 1] : null;
  const nextMod = currentIdx >= 0 && currentIdx < allModules.length - 1 ? allModules[currentIdx + 1] : null;

  const bookmarkKey = `module:${subject.code}:${module.module_number}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/subjects" className="hover:text-indigo-600">
            Subjects
          </Link>
          <span>/</span>
          <Link to={`/subjects/${subject.code}`} className="font-medium hover:text-indigo-600">
            {subject.code}
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Module {module.module_number}
          </span>
        </div>

        <div className="flex gap-1.5">
          {allModules.map((m) => (
            <Link
              key={m.id}
              to={`/subjects/${subject.code}/module/${m.module_number}`}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                m.module_number === module.module_number
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              M{m.module_number}
            </Link>
          ))}
        </div>
      </div>

      {/* Section 1: Module Overview & Topic Checklist */}
      <Card className="mt-4">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="indigo" className="font-mono">
                  {subject.code} • Module {module.module_number}
                </Badge>
                <Badge variant="outline">~{module.estimated_hours} Study Hours</Badge>
              </div>
              <h1 className="mt-2.5 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
                {module.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {module.description}
              </p>
            </div>

            <Button
              size="sm"
              variant={isBookmarked(bookmarkKey) ? 'primary' : 'outline'}
              onClick={() =>
                toggleBookmark({
                  key: bookmarkKey,
                  kind: 'module',
                  title: `${subject.code} Module ${module.module_number}: ${module.title}`,
                  subtitle: subject.name,
                  subjectCode: subject.code,
                  url: `/subjects/${subject.code}/module/${module.module_number}`,
                })
              }
            >
              <Bookmark
                className={cn('h-4 w-4', isBookmarked(bookmarkKey) && 'fill-current')}
              />
              {isBookmarked(bookmarkKey) ? 'Saved' : 'Bookmark Module'}
            </Button>
          </div>

          {topics.length > 0 && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Module Topics Checklist (Track Your Study)
                </h2>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {completedTopicsCount}/{topics.length} Completed ({modPct}%)
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {topics.map((t) => {
                  const done = completedTopicIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTopicComplete(t.id)}
                      className={cn(
                        'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors cursor-pointer',
                        done
                          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30'
                          : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900'
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              done
                                ? 'text-emerald-900 line-through dark:text-emerald-200'
                                : 'text-slate-900 dark:text-slate-100'
                            )}
                          >
                            {t.title}
                          </span>
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.2 text-[10px] font-medium',
                              IMPORTANCE_META[t.importance].className
                            )}
                          >
                            {IMPORTANCE_META[t.importance].label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {t.summary}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Anchor Jump Bar */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {[
          { href: '#simplified-notes', label: 'Simplified Notes' },
          { href: '#original-notes', label: 'KTU Notes' },
          { href: '#handwritten-notes', label: 'Handwritten Notes' },
          { href: '#important-questions', label: 'Important Questions' },
          { href: '#questions', label: 'Question Bank' },
          { href: '#pyqs', label: 'PYQs' },
          { href: '#solved-answers', label: 'Solved Answers' },
          { href: '#programs', label: 'Programs / Problems' },
          { href: '#quick-revision', label: 'Quick Revision' },
        ].map((anchor) => (
          <a
            key={anchor.href}
            href={anchor.href}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            {anchor.label}
          </a>
        ))}
      </div>

      {/* Section 2: Simplified Exam-Friendly Notes */}
      <section id="simplified-notes" className="mt-8 scroll-mt-20">
        <SectionTitle
          icon={Sparkles}
          title="2. Simplified Exam-Friendly Notes"
          subtitle="Extremely simple English, bullet points, comparison tables & diagrams"
        />
        {examNotes.length === 0 ? (
          <SectionEmpty text="No simplified notes added for this module yet." />
        ) : (
          <div className="space-y-4">
            {examNotes.map((note) =>
              (note.file_url || note.file_path) && !note.content_markdown ? (
                <ResourceFileCard
                  key={note.id}
                  resource={note}
                  onPreview={(url, downloadUrl) =>
                    setPdfPreview({ ...note, file_url: url || note.file_url, download_url: downloadUrl })
                  }
                />
              ) : (
                <Card key={note.id}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          IMPORTANCE_META[note.importance].className
                        )}
                      >
                        {IMPORTANCE_META[note.importance].label}
                      </span>
                      <Badge variant="outline">Simplified Exam Notes</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{note.title}</h3>
                    {note.diagram_key && (
                      <div className="mt-4">
                        <DiagramGallery diagramKey={note.diagram_key} />
                      </div>
                    )}
                    {note.content_markdown && (
                      <div className="mt-4">
                        <MarkdownRenderer content={note.content_markdown} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </section>

      {/* Section 3 & 4: KTU Notes & Handwritten Notes */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section id="original-notes" className="scroll-mt-20">
          <SectionTitle
            icon={FileText}
            title="3. KTU Notes"
            subtitle="KTU course notes organized by module"
          />
          {originalNotes.length === 0 ? (
            <SectionEmpty text="No KTU notes linked to this module yet." />
          ) : (
            <div className="space-y-3">
              {originalNotes.map((doc) => (
                <ResourceFileCard key={doc.id} resource={doc} onPreview={(url, downloadUrl) => setPdfPreview({ ...doc, file_url: url || doc.file_url, download_url: downloadUrl })} />
              ))}
            </div>
          )}
        </section>

        <section id="handwritten-notes" className="scroll-mt-20">
          <SectionTitle
            icon={PenTool}
            title="4. Handwritten Notes"
            subtitle="Student study sheets & compact PDFs"
          />
          {handwrittenNotes.length === 0 ? (
            <SectionEmpty text="No handwritten notes linked to this module yet." />
          ) : (
            <div className="space-y-3">
              {handwrittenNotes.map((doc) => (
                <ResourceFileCard key={doc.id} resource={doc} onPreview={(url, downloadUrl) => setPdfPreview({ ...doc, file_url: url || doc.file_url, download_url: downloadUrl })} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Section 5: Important Questions */}
      <section id="important-questions" className="mt-8 scroll-mt-20">
        <SectionTitle
          icon={Star}
          title="5. Important & Must-Study Questions"
          subtitle="High-priority syllabus questions for focused exam prep"
        />
        {importantQuestions.length === 0 ? (
          <SectionEmpty text="No important questions marked for this module yet." />
        ) : (
          <div className="space-y-3">
            {importantQuestions.map((q) => (
              <QuestionCard key={`imp-${q.id}`} question={q} />
            ))}
          </div>
        )}
      </section>

      {/* Section 6: Full Module Question Bank */}
      <section id="questions" className="mt-8 scroll-mt-20">
        <SectionTitle
          icon={HelpCircle}
          title="6. Module Question Bank"
          subtitle="Test yourself — click Reveal Answer to check your response"
        />
        {questions.length === 0 && questionBankDocs.length === 0 ? (
          <SectionEmpty text="No question bank entries for this module yet." />
        ) : (
          <div className="space-y-4">
            {questionBankDocs.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {questionBankDocs.map((doc) => (
                  <ResourceFileCard
                    key={doc.id}
                    resource={doc}
                    onPreview={(url, downloadUrl) =>
                      setPdfPreview({ ...doc, file_url: url || doc.file_url, download_url: downloadUrl })
                    }
                  />
                ))}
              </div>
            )}
            {questions.length > 0 && (
              <div className="space-y-3">
                {questions.map((q) => (
                  <QuestionCard key={`qb-${q.id}`} question={q} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 7: PYQs & Model Papers */}
      <section id="pyqs" className="mt-8 scroll-mt-20">
        <SectionTitle
          icon={GraduationCap}
          title="7. PYQs & Model Question Papers"
          subtitle="Module-tagged and full-subject examination papers"
        />
        {modulePyqs.length === 0 && subjectLevelPapers.length === 0 ? (
          <SectionEmpty text="No PYQs or model papers uploaded for this subject yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...modulePyqs, ...subjectLevelPapers].map((doc) => (
              <ResourceFileCard key={doc.id} resource={doc} onPreview={(url, downloadUrl) => setPdfPreview({ ...doc, file_url: url || doc.file_url, download_url: downloadUrl })} />
            ))}
          </div>
        )}
      </section>

      {/* Section 8: Solved Answers */}
      <section id="solved-answers" className="mt-8 scroll-mt-20">
        <SectionTitle
          icon={CheckCircle2}
          title="8. Solved Answers Library"
          subtitle="Exam-friendly short answers with detailed explanations"
        />
        {solvedQuestions.length === 0 ? (
          <SectionEmpty text="No solved answers added for this module yet." />
        ) : (
          <div className="space-y-3">
            {solvedQuestions.map((q) => (
              <QuestionCard key={`sol-${q.id}`} question={q} defaultRevealed />
            ))}
          </div>
        )}
      </section>

      {/* Section 9: Programs / Numerical Problems */}
      <section id="programs" className="mt-8 scroll-mt-20">
        <SectionTitle
          icon={FileCode2}
          title="9. Programs & Applied Examples"
          subtitle="Runnable code examples, sample outputs & explanations"
        />
        {programs.length === 0 ? (
          <SectionEmpty text="No programming or numerical examples added for this module yet." />
        ) : (
          <div className="space-y-4">
            {programs.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
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
                  <h3 className="mt-2.5 text-base font-bold text-slate-900 dark:text-white">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {p.problem_statement}
                  </p>
                  <CodeBlock code={p.code} language={p.language} />
                  {p.sample_output && (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Sample Output:
                      </span>
                      <pre className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                        {p.sample_output}
                      </pre>
                    </div>
                  )}
                  {p.explanation && (
                    <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300">
                      {p.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Section 10: Quick Revision */}
      <section id="quick-revision" className="mt-8 scroll-mt-20">
        <SectionTitle
          icon={Zap}
          title="10. Module Quick Revision"
          subtitle="Compact definitions, syntax & comparisons for last-minute review"
        />
        {revisionItems.length === 0 ? (
          <SectionEmpty text="No quick revision cards added for this module yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {revisionItems.map((ri) => (
              <Card key={ri.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="blue" className="capitalize">
                      {ri.category}
                    </Badge>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11px] font-medium',
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
            ))}
          </div>
        )}
      </section>

      {/* Prev / Next Module Footer */}
      <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-800">
        {prevMod ? (
          <Link to={`/subjects/${subject.code}/module/${prevMod.module_number}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Module {prevMod.module_number}: {prevMod.title}
            </Button>
          </Link>
        ) : (
          <Link to={`/subjects/${subject.code}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Subject Overview
            </Button>
          </Link>
        )}

        {nextMod && (
          <Link to={`/subjects/${subject.code}/module/${nextMod.module_number}`}>
            <Button>
              Module {nextMod.module_number}: {nextMod.title}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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
        mimeType={pdfPreview?.mime_type}
        onRefreshUrl={pdfPreview ? () => api.refreshPreviewUrls(pdfPreview) : undefined}
      />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        {title}
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

function SectionEmpty({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-5 text-xs text-slate-500 dark:text-slate-400">{text}</CardContent>
    </Card>
  );
}
