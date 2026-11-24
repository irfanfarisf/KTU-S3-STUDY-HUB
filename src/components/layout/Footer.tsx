import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <GraduationCap className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                KTU Study Hub
              </span>
            </div>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Everything for your semester, in one place. Browse resources by branch, semester,
              subject and module, or help other KTU students by sharing useful academic materials.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Study Libraries
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><Link to="/#browse" className="hover:text-indigo-600 dark:hover:text-indigo-400">Browse branches &amp; semesters</Link></li>
              <li><Link to="/submit-resource" className="hover:text-indigo-600 dark:hover:text-indigo-400">Submit a Resource</Link></li>
              <li><Link to="/notes" className="hover:text-indigo-600 dark:hover:text-indigo-400">Exam &amp; Handwritten Notes</Link></li>
              <li><Link to="/pyqs" className="hover:text-indigo-600 dark:hover:text-indigo-400">PYQ &amp; Model Papers</Link></li>
              <li><Link to="/question-bank" className="hover:text-indigo-600 dark:hover:text-indigo-400">Question Bank</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Tools &amp; CMS
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li><Link to="/quick-revision" className="hover:text-indigo-600 dark:hover:text-indigo-400">Quick Revision Hub</Link></li>
              <li><Link to="/search" className="hover:text-indigo-600 dark:hover:text-indigo-400">Global Search</Link></li>
              <li><Link to="/bookmarks" className="hover:text-indigo-600 dark:hover:text-indigo-400">Bookmarks &amp; Progress</Link></li>
              <li><Link to="/admin" className="hover:text-indigo-600 dark:hover:text-indigo-400">Admin Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center dark:border-slate-800">
          <span>KTU Study Hub • Student-oriented academic resources</span>
          <span>No login required — save progress locally or sign in to sync across devices</span>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">KTU Study Hub is an independent student-oriented academic resource platform and is not an official website of APJ Abdul Kalam Technological University.</p>
      </div>
    </footer>
  );
}
