import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, FileCode2, FileText, HelpCircle, Layers, Search } from 'lucide-react';
import type { Subject } from '@shared/types';
import { api } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

export function SubjectsPage() {
  const { selection } = useStudy();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [focusFilter, setFocusFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    api
      .getSubjects({
        universityId: selection.universityId,
        schemeId: selection.schemeId,
        branchId: selection.branchId,
        semesterId: selection.semesterId,
      })
      .then(setSubjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selection.universityId, selection.schemeId, selection.branchId, selection.semesterId]);

  const filtered = subjects.filter((s) => {
    const matchesText =
      !filterText.trim() ||
      s.code.toLowerCase().includes(filterText.toLowerCase()) ||
      s.name.toLowerCase().includes(filterText.toLowerCase()) ||
      s.short_description.toLowerCase().includes(filterText.toLowerCase());
    const matchesFocus = focusFilter === 'all' || s.content_focus === focusFilter;
    return matchesText && matchesFocus;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <BookOpen className="h-3.5 w-3.5" />
            Curriculum Directory
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            All Subjects
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Independent subject portals structured by the KTU 2024 Scheme syllabus.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter code or name..."
              className="pl-9"
            />
          </div>
          <Select
            value={focusFilter}
            onChange={(e) => setFocusFilter(e.target.value)}
            className="w-full sm:w-44"
          >
            <option value="all">All Focus Types</option>
            <option value="programming">Programming</option>
            <option value="theory">Theory</option>
            <option value="mathematical">Mathematical</option>
            <option value="numerical">Numerical</option>
            <option value="diagram">Diagram / Lab</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No matching subjects found for the current scope and filter.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((subject) => (
            <Card
              key={subject.id}
              className="flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700"
            >
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="indigo" className="font-mono font-semibold">
                    {subject.code}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {subject.content_focus}
                  </Badge>
                </div>

                <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                  {subject.name}
                </h2>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {subject.short_description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                    <Layers className="h-3 w-3 text-indigo-500" />
                    {subject.module_count || 0} Modules
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                    <FileText className="h-3 w-3 text-blue-500" />
                    {subject.resource_count || 0} Resources
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                    <HelpCircle className="h-3 w-3 text-amber-500" />
                    {subject.question_count || 0} Qs
                  </span>
                  {(subject.program_count || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                      <FileCode2 className="h-3 w-3 text-emerald-500" />
                      {subject.program_count} Code
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    CIE {subject.cie_marks} / ESE {subject.ese_marks} • {subject.credits} Cr
                  </span>
                  <Link to={`/subjects/${subject.code}`}>
                    <Button size="sm">
                      Open Subject <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
