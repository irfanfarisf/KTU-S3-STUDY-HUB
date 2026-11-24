import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, CheckCircle2, HelpCircle, Trash2 } from 'lucide-react';
import type { Subject } from '@shared/types';
import { api } from '@/lib/api';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function BookmarksProgressPage() {
  const {
    selection,
    bookmarks,
    toggleBookmark,
    completedTopicIds,
    practicedQuestionIds,
    clearStudentProgress,
    studentUser,
  } = useStudy();
  const [subjects, setSubjects] = useState<Subject[]>([]);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Bookmark className="h-3.5 w-3.5" />
            {studentUser ? 'Synced Student Account' : 'Student Workspace'}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Bookmarks &amp; Study Progress
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {studentUser ? `Synced to ${studentUser.email} across your devices.` : 'Saved in this browser. Sign in to sync your progress across devices.'}
          </p>
        </div>

        {(bookmarks.length > 0 || completedTopicIds.length > 0 || practicedQuestionIds.length > 0) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm(studentUser ? 'Clear all bookmarks and study progress in your account?' : 'Clear all saved bookmarks and study progress in this browser?')) {
                clearStudentProgress();
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset Progress
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {bookmarks.length}
              </div>
              <div className="text-xs text-slate-500">Saved Bookmarks</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {completedTopicIds.length}
              </div>
              <div className="text-xs text-slate-500">Topics Completed</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {practicedQuestionIds.length}
              </div>
              <div className="text-xs text-slate-500">Questions Practiced</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Bookmarks */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
          Saved Items ({bookmarks.length})
        </h2>
        {bookmarks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-slate-500">
              No bookmarks yet. Click the bookmark icon on any subject, module, note, or question
              to save it here for quick exam review.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {bookmarks.map((b) => (
              <Card key={b.key}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {b.subjectCode && <Badge variant="indigo">{b.subjectCode}</Badge>}
                      <Badge variant="outline" className="capitalize">
                        {b.kind}
                      </Badge>
                    </div>
                    <Link
                      to={b.url}
                      className="mt-2 block text-sm font-bold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                    >
                      {b.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">{b.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={b.url}>
                      <Button size="sm" variant="ghost">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(b)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      title="Remove bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Subject Study Links */}
      {subjects.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
            Jump to Current Semester Subjects
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {subjects.map((s) => (
              <Link key={s.id} to={`/subjects/${s.code}`}>
                <Card className="hover:border-indigo-300 dark:hover:border-indigo-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="indigo">{s.code}</Badge>
                      <span className="text-xs text-slate-500">{s.topic_count || 0} topics</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                      {s.name}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
