import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import type { SearchResultItem, Subject } from '@shared/types';
import { api } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { IMPORTANCE_META, cn } from '@/lib/utils';

const KIND_LABELS: Record<SearchResultItem['kind'], string> = {
  subject: 'Subject',
  module: 'Module',
  topic: 'Topic',
  resource: 'Resource',
  question: 'Question',
  program: 'Program',
  revision: 'Quick Revision',
};

export function SearchPage() {
  const { selection } = useStudy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') || '');
  const [moduleNum, setModuleNum] = useState(searchParams.get('moduleNumber') || '');
  const [resourceType, setResourceType] = useState(searchParams.get('resourceType') || '');
  const [importance, setImportance] = useState(searchParams.get('importance') || '');
  const [examYear, setExamYear] = useState(searchParams.get('examYear') || '');

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
    const qFromUrl = searchParams.get('q') || '';
    setQuery(qFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .search({
          q: query || undefined,
          subjectId: subjectId ? Number(subjectId) : undefined,
          moduleNumber: moduleNum ? Number(moduleNum) : undefined,
          resourceType: resourceType || undefined,
          importance: importance || undefined,
          examYear: examYear || undefined,
        })
        .then(setResults)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, subjectId, moduleNum, resourceType, importance, examYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set('q', query.trim());
    if (subjectId) next.set('subjectId', subjectId);
    if (moduleNum) next.set('moduleNumber', moduleNum);
    if (resourceType) next.set('resourceType', resourceType);
    if (importance) next.set('importance', importance);
    if (examYear) next.set('examYear', examYear);
    setSearchParams(next);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Search className="h-3.5 w-3.5" />
          Semester-Wide Search
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Global Academic Search
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Search across all subjects, subject codes, modules, topics, notes, questions, and
          programs.
        </p>
      </div>

      <Card className="mt-5">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type topic, subject code, keyword (e.g., JDBC, Singleton, PBCST304, DFA)..."
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>

            <Select value={moduleNum} onChange={(e) => setModuleNum(e.target.value)}>
              <option value="">All Modules</option>
              {[1, 2, 3, 4, 5].map((m) => (
                <option key={m} value={String(m)}>
                  Module {m}
                </option>
              ))}
            </Select>

            <Select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
              <option value="">All Resource Types</option>
              <option value="exam_notes">Simplified Exam Notes</option>
              <option value="handwritten_notes">Handwritten Notes</option>
              <option value="original_notes">Original Notes</option>
              <option value="syllabus">Syllabus</option>
              <option value="pyq">PYQs</option>
              <option value="model_paper">Model Papers</option>
              <option value="question">Question Bank</option>
              <option value="program">Programs</option>
              <option value="revision">Quick Revision</option>
            </Select>

            <Select value={importance} onChange={(e) => setImportance(e.target.value)}>
              <option value="">All Importance</option>
              <option value="must_study">Must Study</option>
              <option value="important">Important</option>
              <option value="additional">Additional</option>
            </Select>

            <Input
              value={examYear}
              onChange={(e) => setExamYear(e.target.value)}
              placeholder="Exam Year (optional)"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{loading ? 'Searching...' : `${results.length} matching results`}</span>
      </div>

      <div className="mt-3 space-y-2.5">
        {!loading && results.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              No matching resources found. Try a broader keyword or clear filters.
            </CardContent>
          </Card>
        ) : (
          results.map((r) => (
            <Link key={`${r.kind}-${r.id}`} to={r.url} className="block group">
              <Card className="hover:border-indigo-300 dark:hover:border-indigo-700">
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="indigo">{r.subject_code}</Badge>
                      <Badge variant="blue">{KIND_LABELS[r.kind]}</Badge>
                      {r.module_number && <Badge variant="outline">Module {r.module_number}</Badge>}
                      {r.importance && (
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.2 text-[11px] font-medium',
                            IMPORTANCE_META[r.importance].className
                          )}
                        >
                          {IMPORTANCE_META[r.importance].label}
                        </span>
                      )}
                      {r.exam_year && <Badge variant="outline">{r.exam_year}</Badge>}
                    </div>
                    <h3 className="mt-2 truncate text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {r.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {r.snippet}
                    </p>
                  </div>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
