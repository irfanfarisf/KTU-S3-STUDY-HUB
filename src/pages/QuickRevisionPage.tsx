import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Zap } from 'lucide-react';
import type { RevisionItem, Subject } from '@shared/types';
import { api } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { CodeBlock, MarkdownRenderer } from '@/components/study/MarkdownRenderer';
import { DiagramGallery } from '@/components/study/DiagramGallery';
import { IMPORTANCE_META, cn } from '@/lib/utils';

export function QuickRevisionPage() {
  const { selection } = useStudy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsReady, setSubjectsReady] = useState(false);
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const subjectParam = searchParams.get('subject') || 'all';
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    let active = true;
    setSubjectsReady(false);
    api
      .getSubjects({
        universityId: selection.universityId,
        schemeId: selection.schemeId,
        branchId: selection.branchId,
        semesterId: selection.semesterId,
      })
      .then((rows) => {
        if (active) {
          setSubjects(rows);
          setSubjectsReady(true);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setSubjectsReady(true);
      });
    return () => { active = false; };
  }, [selection]);

  useEffect(() => {
    if (subjectParam !== 'all' && !subjectsReady) return;
    setLoading(true);
    const matched = subjects.find(
      (s) => s.code.toLowerCase() === subjectParam.toLowerCase() || String(s.id) === subjectParam
    );
    api
      .getRevisionItems({
        subjectId: matched?.id,
        schemeId: selection.schemeId,
        branchId: selection.branchId,
        semesterId: selection.semesterId,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      })
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectParam, subjects, subjectsReady, categoryFilter, selection.schemeId, selection.branchId, selection.semesterId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Zap className="h-3.5 w-3.5" />
            Rapid Exam-Eve Review
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Quick Revision Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Compact definitions, key syntax, comparison tables, diagrams, and high-yield programs.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />
          Print Revision Sheet
        </Button>
      </div>

      <Card className="mt-5">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
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

          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Revision Categories</option>
            <option value="definition">Important Definitions</option>
            <option value="concept">Key Concepts</option>
            <option value="formula">Formulas</option>
            <option value="syntax">Syntax Cheat Codes</option>
            <option value="comparison">Comparisons</option>
            <option value="diagram">Diagrams</option>
            <option value="program">Programs</option>
            <option value="faq">Frequently Tested</option>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : items.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            No quick revision cards found for this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {items.map((ri) => (
            <Card key={ri.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {ri.subject_code && <Badge variant="indigo">{ri.subject_code}</Badge>}
                  {ri.module_number && <Badge variant="outline">Module {ri.module_number}</Badge>}
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
    </div>
  );
}
