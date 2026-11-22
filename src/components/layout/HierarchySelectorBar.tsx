import React from 'react';
import { Layers } from 'lucide-react';
import { useStudy } from '@/context/StudyContext';

export function HierarchySelectorBar() {
  const { hierarchy, selection, setSelection } = useStudy();

  if (!hierarchy) return null;

  return (
    <div className="border-b border-slate-200/80 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2 text-xs sm:px-6">
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
          <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          Academic Scope:
        </span>

        <select
          aria-label="University"
          value={selection.universityId}
          onChange={(e) => setSelection({ universityId: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {hierarchy.universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.short_name}
            </option>
          ))}
        </select>

        <span className="text-slate-400">→</span>

        <select
          aria-label="Scheme"
          value={selection.schemeId}
          onChange={(e) => setSelection({ schemeId: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {hierarchy.schemes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <span className="text-slate-400">→</span>

        <select
          aria-label="Academic Year"
          value={selection.academicYearId}
          onChange={(e) => setSelection({ academicYearId: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {hierarchy.academicYears.map((ay) => (
            <option key={ay.id} value={ay.id}>
              {ay.label}
            </option>
          ))}
        </select>

        <span className="text-slate-400">→</span>

        <select
          aria-label="Branch"
          value={selection.branchId}
          onChange={(e) => setSelection({ branchId: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {hierarchy.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.short_name} ({b.code})
            </option>
          ))}
        </select>

        <span className="text-slate-400">→</span>

        <select
          aria-label="Semester"
          value={selection.semesterId}
          onChange={(e) => setSelection({ semesterId: Number(e.target.value) })}
          className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
        >
          {hierarchy.semesters.map((sem) => (
            <option key={sem.id} value={sem.id}>
              {sem.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
