import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import type { Question, Resource, Subject } from '@shared/types';
import { api } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { QuestionCard } from '@/components/study/QuestionCard';
import { PdfViewerModal } from '@/components/study/PdfViewerModal';
import { ResourceFileCard } from '@/pages/SubjectDetailPage';

export function QuestionBankPage() {
  const { selection, practicedQuestionIds } = useStudy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankResources, setBankResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankLoading, setBankLoading] = useState(true);
  const [revealAllKey, setRevealAllKey] = useState(0);
  const [revealAllDefault, setRevealAllDefault] = useState(false);

  const subjectParam = searchParams.get('subject') || 'all';
  const [typeFilter, setTypeFilter] = useState('all');
  const [impFilter, setImpFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [solvedOnly, setSolvedOnly] = useState(false);

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
    const matchedSubject = subjects.find(
      (s) => s.code.toLowerCase() === subjectParam.toLowerCase() || String(s.id) === subjectParam
    );
    api
      .getQuestions({
        subjectId: matchedSubject?.id,
        questionType: typeFilter !== 'all' ? typeFilter : undefined,
        importance: impFilter !== 'all' ? impFilter : undefined,
        difficulty: diffFilter !== 'all' ? diffFilter : undefined,
        solvedOnly,
      })
      .then(setQuestions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectParam, subjects, typeFilter, impFilter, diffFilter, solvedOnly]);

  useEffect(() => {
    const matchedSubject = subjects.find(
      (s) => s.code.toLowerCase() === subjectParam.toLowerCase() || String(s.id) === subjectParam
    );
    setBankLoading(true);
    api
      .getResources({
        subjectId: matchedSubject?.id,
        category: 'Question Banks',
        importance: impFilter !== 'all' ? impFilter : undefined,
        schemeId: selection.schemeId,
        semesterId: selection.semesterId,
      })
      .then(setBankResources)
      .catch(console.error)
      .finally(() => setBankLoading(false));
  }, [subjectParam, subjects, impFilter, selection.schemeId, selection.semesterId]);

  const practicedCount = questions.filter((q) => practicedQuestionIds.includes(q.id)).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <HelpCircle className="h-3.5 w-3.5" />
            Self-Practice &amp; Solved Library
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Question Bank &amp; Solved Questions
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Practice exam-style questions across all 8 categories and reveal answers when ready.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {practicedCount}/{questions.length} Practiced
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRevealAllDefault((r) => !r);
              setRevealAllKey((k) => k + 1);
            }}
          >
            {revealAllDefault ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealAllDefault ? 'Hide All Answers' : 'Reveal All Answers'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mt-5">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            value={subjectParam}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value === 'all') next.delete('subject');
              else next.set('subject', e.target.value);
              setSearchParams(next);
            }}
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </Select>

          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="short_answer">Short Answer</option>
            <option value="descriptive">Descriptive</option>
            <option value="definition">Definition</option>
            <option value="programming">Programming</option>
            <option value="numerical">Numerical / Tracing</option>
            <option value="comparison">Comparison</option>
            <option value="diagram">Diagram-Based</option>
            <option value="problem_solving">Problem Solving</option>
          </Select>

          <Select value={impFilter} onChange={(e) => setImpFilter(e.target.value)}>
            <option value="all">All Importance</option>
            <option value="must_study">Must Study</option>
            <option value="important">Important</option>
            <option value="additional">Additional</option>
          </Select>

          <Select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)}>
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>

          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={solvedOnly}
              onChange={(e) => setSolvedOnly(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600"
            />
            Solved Questions Only
          </label>
        </CardContent>
      </Card>

      {loading || bankLoading ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : questions.length === 0 && bankResources.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            No question banks or questions match your current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-8">
          {bankResources.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
                Uploaded Question Bank PDFs ({bankResources.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bankResources.map((resource) => (
                  <ResourceFileCard
                    key={resource.id}
                    resource={resource}
                    onPreview={(url) => setPdfPreview({ ...resource, file_url: url || resource.file_url })}
                  />
                ))}
              </div>
            </section>
          )}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Practice Questions
            </h2>
            {questions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-sm text-slate-500">
                  No structured questions match your current filters.
                </CardContent>
              </Card>
            ) : (
              questions.map((q) => (
              <QuestionCard
                key={`${q.id}-${revealAllKey}`}
                question={q}
                defaultRevealed={revealAllDefault}
                showSubjectBadge
              />
              ))
            )}
          </section>
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
