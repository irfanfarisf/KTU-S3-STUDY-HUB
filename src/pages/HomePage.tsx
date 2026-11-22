import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileCode2,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  PenTool,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { Subject } from '@shared/types';
import { api } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const QUICK_ACCESS = [
  {
    title: 'All Subjects',
    desc: 'Browse full S3 curriculum',
    to: '/subjects',
    icon: BookOpen,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400',
  },
  {
    title: 'Exam-Friendly Notes',
    desc: 'Short, bulleted & simplified',
    to: '/notes?type=exam_notes',
    icon: Sparkles,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400',
  },
  {
    title: 'Handwritten Notes',
    desc: 'PDFs & classroom sheets',
    to: '/notes?type=handwritten_notes,original_notes',
    icon: PenTool,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  {
    title: 'PYQs',
    desc: 'Regular & supplementary papers',
    to: '/pyqs',
    icon: GraduationCap,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400',
  },
  {
    title: 'Question Bank',
    desc: 'Topic-wise practice & reveal',
    to: '/question-bank',
    icon: HelpCircle,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400',
  },
  {
    title: 'Model Papers',
    desc: 'Sample & practice exam sets',
    to: '/pyqs?examType=model',
    icon: ClipboardList,
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400',
  },
  {
    title: 'Quick Revision',
    desc: 'Last-minute cram sheets',
    to: '/quick-revision',
    icon: Zap,
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60 dark:text-cyan-400',
  },
  {
    title: 'Syllabus',
    desc: 'KTU 2024 Scheme modules',
    to: '/notes?type=syllabus',
    icon: FileText,
    color: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
  },
];

export function HomePage() {
  const { selection, hierarchy, completedTopicIds, bookmarks } = useStudy();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getSubjects({
        universityId: selection.universityId,
        schemeId: selection.schemeId,
        branchId: selection.branchId,
        semesterId: selection.semesterId,
      })
      .then((data) => {
        if (active) setSubjects(data);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selection.universityId, selection.schemeId, selection.branchId, selection.semesterId]);

  const activeBranch = hierarchy?.branches.find((b) => b.id === selection.branchId);
  const activeSem = hierarchy?.semesters.find((s) => s.id === selection.semesterId);
  const activeScheme = hierarchy?.schemes.find((s) => s.id === selection.schemeId);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero Section */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Layers className="h-3.5 w-3.5" />
            {activeScheme?.name || '2024 Scheme'} • {activeBranch?.code || 'CSE'} •{' '}
            {activeSem?.code || 'S3'}
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            KTU S3 Study Hub
          </h1>
          <p className="mt-2 text-base font-semibold text-indigo-600 dark:text-indigo-400 sm:text-lg">
            Your complete semester study companion.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
            Access simplified notes, handwritten notes, previous-year questions, question banks and
            exam-focused resources for all your S3 subjects.
          </p>

          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject (PBCST304, DSA), topic (JDBC, DFA), or question..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 rounded-2xl px-6">
              Search Hub
            </Button>
          </form>

          {/* Hero Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/subjects">
              <Button variant="primary" size="md">
                <BookOpen className="h-4 w-4" />
                Browse Subjects
              </Button>
            </Link>
            <Link to="/notes">
              <Button variant="outline" size="md">
                <FileText className="h-4 w-4" />
                Explore Resources
              </Button>
            </Link>
            <Link to="/quick-revision">
              <Button variant="secondary" size="md">
                <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Quick Revision
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick-Access Grid */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
              Quick Access
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jump directly to exam-ready materials across your semester
            </p>
          </div>
          {(completedTopicIds.length > 0 || bookmarks.length > 0) && (
            <Link
              to="/bookmarks"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completedTopicIds.length} topics studied • {bookmarks.length} saved
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {QUICK_ACCESS.map((item) => (
            <Link key={item.title} to={item.to} className="group">
              <Card className="h-full hover:border-indigo-300 hover:shadow-sm dark:hover:border-indigo-700">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {item.desc}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Subject Overview Grid */}
      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {activeSem?.code || 'S3'} {activeBranch?.code || 'CSE'} Subjects Overview
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              Every subject has its own independent syllabus, module notes, question bank, and quick
              revision space.
            </p>
          </div>
          <Link
            to="/subjects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            View Full Directory <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No subjects configured for this Branch / Semester selection yet.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Switch back to CSE • S3 above or add subjects for this branch in the Admin Dashboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => {
              const hasFullResources =
                (subject.resource_count || 0) > 0 || (subject.question_count || 0) > 0;

              return (
                <Card
                  key={subject.id}
                  className="flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm dark:hover:border-indigo-700"
                >
                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="indigo" className="font-mono font-semibold">
                        {subject.code}
                      </Badge>
                      <Badge variant={hasFullResources ? 'emerald' : 'outline'}>
                        {hasFullResources ? 'Notes & Q-Bank Live' : 'Syllabus Ready'}
                      </Badge>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                      {subject.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {subject.short_description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                        <Layers className="h-3 w-3 text-indigo-500" />
                        {subject.module_count || 0} Modules
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                        <FileText className="h-3 w-3 text-blue-500" />
                        {subject.resource_count || 0} Resources
                      </span>
                      {(subject.question_count || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          <HelpCircle className="h-3 w-3 text-amber-500" />
                          {subject.question_count} Questions
                        </span>
                      )}
                      {(subject.program_count || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                          <FileCode2 className="h-3 w-3 text-emerald-500" />
                          {subject.program_count} Programs
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {subject.credits} Credits • {subject.course_type}
                      </span>
                      <Link to={`/subjects/${subject.code}`}>
                        <Button size="sm" variant={hasFullResources ? 'primary' : 'outline'}>
                          View Subject
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
