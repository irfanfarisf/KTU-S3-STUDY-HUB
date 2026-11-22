import React, { useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import type { Question } from '@shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CodeBlock, MarkdownRenderer } from '@/components/study/MarkdownRenderer';
import { DiagramGallery } from '@/components/study/DiagramGallery';
import { IMPORTANCE_META, cn } from '@/lib/utils';
import { useStudy } from '@/context/StudyContext';

interface QuestionCardProps {
  question: Question;
  defaultRevealed?: boolean;
  showSubjectBadge?: boolean;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  short_answer: 'Short Answer',
  descriptive: 'Descriptive',
  definition: 'Definition',
  programming: 'Programming',
  numerical: 'Numerical / Tracing',
  comparison: 'Comparison',
  diagram: 'Diagram-Based',
  problem_solving: 'Problem Solving',
};

export function QuestionCard({
  question,
  defaultRevealed = false,
  showSubjectBadge = false,
}: QuestionCardProps) {
  const [revealed, setRevealed] = useState(defaultRevealed);
  const [showDetailed, setShowDetailed] = useState(false);
  const { isBookmarked, toggleBookmark, practicedQuestionIds, markQuestionPracticed } = useStudy();

  const bookmarkKey = `question:${question.id}`;
  const bookmarked = isBookmarked(bookmarkKey);
  const practiced = practicedQuestionIds.includes(question.id);
  const imp = IMPORTANCE_META[question.importance] || IMPORTANCE_META.important;

  const handleToggleReveal = () => {
    const next = !revealed;
    setRevealed(next);
    if (next) {
      markQuestionPracticed(question.id);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {showSubjectBadge && question.subject_code && (
              <Badge variant="indigo">{question.subject_code}</Badge>
            )}
            {question.module_number && (
              <Badge variant="outline">Module {question.module_number}</Badge>
            )}
            <Badge variant="blue">
              {QUESTION_TYPE_LABELS[question.question_type] || question.question_type}
            </Badge>
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', imp.className)}>
              {imp.label}
            </span>
            {question.marks && (
              <Badge variant="outline">{question.marks} Marks</Badge>
            )}
            {question.difficulty && (
              <Badge variant="outline" className="capitalize">
                {question.difficulty}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {practiced && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Practiced
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                toggleBookmark({
                  key: bookmarkKey,
                  kind: 'question',
                  title: question.question_text,
                  subtitle: `${question.subject_code || ''} ${question.module_number ? `• Module ${question.module_number}` : ''}`,
                  subjectCode: question.subject_code || '',
                  url: question.subject_code
                    ? question.module_number
                      ? `/subjects/${question.subject_code}/module/${question.module_number}#questions`
                      : `/question-bank?subject=${question.subject_code}`
                    : '/question-bank',
                })
              }
              className={cn(
                'rounded-lg p-1.5 transition-colors cursor-pointer',
                bookmarked
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800'
              )}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark question'}
            >
              <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current')} />
            </button>
          </div>
        </div>

        <h4 className="mt-3 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:text-base">
          {question.question_text}
        </h4>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Source: {question.source_label}</span>
            {question.topic_title && <span>• Topic: {question.topic_title}</span>}
            {question.exam_year && <span>• Year: {question.exam_year}</span>}
          </div>

          {question.answer ? (
            <Button
              variant={revealed ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleToggleReveal}
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {revealed ? 'Hide Answer' : 'Reveal Answer'}
            </Button>
          ) : (
            <span className="text-xs italic text-slate-400">Unsolved — practice question</span>
          )}
        </div>

        {revealed && question.answer && (
          <div className="mt-4 rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                Exam-Friendly Answer
              </span>
              {question.answer.expected_marks && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Target: {question.answer.expected_marks} marks
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {question.answer.short_answer}
            </p>

            {question.answer.formula_text && (
              <div className="mt-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                {question.answer.formula_text}
              </div>
            )}

            {question.answer.code_snippet && (
              <CodeBlock
                code={question.answer.code_snippet}
                language={question.answer.code_language || 'java'}
              />
            )}

            {question.answer.diagram_key && (
              <div className="mt-3">
                <DiagramGallery diagramKey={question.answer.diagram_key} />
              </div>
            )}

            {question.answer.detailed_explanation && (
              <div className="mt-3 border-t border-indigo-200/60 pt-2.5 dark:border-indigo-900/50">
                <button
                  type="button"
                  onClick={() => setShowDetailed((s) => !s)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                >
                  {showDetailed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showDetailed ? 'Hide Detailed Explanation' : 'Show Detailed Explanation'}
                </button>
                {showDetailed && (
                  <div className="mt-2">
                    <MarkdownRenderer content={question.answer.detailed_explanation} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
