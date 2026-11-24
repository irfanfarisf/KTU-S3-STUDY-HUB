import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AdminUser, HierarchyData } from '@shared/types';
import { api, type StudentRecord } from '@/lib/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface BookmarkEntry {
  key: string;
  kind: 'resource' | 'question' | 'program' | 'subject' | 'module';
  title: string;
  subtitle: string;
  subjectCode: string;
  url: string;
  savedAt: string;
}

export interface HierarchySelection {
  universityId: number;
  schemeId: number;
  academicYearId: number;
  branchId: number;
  semesterId: number;
}

interface StudyContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
  hierarchy: HierarchyData | null;
  selection: HierarchySelection;
  setSelection: (next: Partial<HierarchySelection>) => void;
  refreshHierarchy: () => Promise<void>;
  bookmarks: BookmarkEntry[];
  isBookmarked: (key: string) => boolean;
  toggleBookmark: (entry: Omit<BookmarkEntry, 'savedAt'>) => void;
  completedTopicIds: number[];
  toggleTopicComplete: (topicId: number) => void;
  practicedQuestionIds: number[];
  markQuestionPracticed: (questionId: number) => void;
  clearStudentProgress: () => void;
  studentUser: User | null;
  authConfigured: boolean;
  adminUser: AdminUser | null;
  setAdminSession: (user: AdminUser | null, token: string | null) => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);
const THEME_KEY = 'ktu_study_hub_theme';
const BOOKMARKS_KEY = 'ktu_study_hub_bookmarks';
const TOPICS_KEY = 'ktu_study_hub_completed_topics';
const PRACTICED_KEY = 'ktu_study_hub_practiced_questions';
const SELECTION_KEY = 'ktu_study_hub_selection';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function makeStudentRecords(
  userId: string,
  bookmarks: BookmarkEntry[],
  topics: number[],
  questions: number[]
): StudentRecord[] {
  return [
    ...bookmarks.map((entry) => ({ user_id: userId, record_key: `bookmark:${entry.key}`, record_type: 'bookmark' as const, payload: entry as unknown as Record<string, unknown> })),
    ...topics.map((id) => ({ user_id: userId, record_key: `topic:${id}`, record_type: 'topic_complete' as const, payload: { topic_id: id } })),
    ...questions.map((id) => ({ user_id: userId, record_key: `question:${id}`, record_type: 'question_practiced' as const, payload: { question_id: id } })),
  ];
}

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');
  const [hierarchy, setHierarchy] = useState<HierarchyData | null>(null);
  const [selection, setSelectionState] = useState<HierarchySelection>(() => loadJson(SELECTION_KEY, {
    universityId: 1, schemeId: 1, academicYearId: 1, branchId: 1, semesterId: 3,
  }));
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => loadJson(BOOKMARKS_KEY, []));
  const [completedTopicIds, setCompletedTopicIds] = useState<number[]>(() => loadJson(TOPICS_KEY, []));
  const [practicedQuestionIds, setPracticedQuestionIds] = useState<number[]>(() => loadJson(PRACTICED_KEY, []));
  const [studentUser, setStudentUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);
  useEffect(() => { if (!studentUser) localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks)); }, [bookmarks, studentUser]);
  useEffect(() => { if (!studentUser) localStorage.setItem(TOPICS_KEY, JSON.stringify(completedTopicIds)); }, [completedTopicIds, studentUser]);
  useEffect(() => { if (!studentUser) localStorage.setItem(PRACTICED_KEY, JSON.stringify(practicedQuestionIds)); }, [practicedQuestionIds, studentUser]);
  useEffect(() => { localStorage.setItem(SELECTION_KEY, JSON.stringify(selection)); }, [selection]);

  const refreshHierarchy = async () => {
    try {
      const data = await api.getHierarchy();
      setHierarchy(data);
      setSelectionState((prev) => ({
        universityId: data.universities.some((u) => u.id === prev.universityId) ? prev.universityId : data.universities[0]?.id ?? 1,
        schemeId: data.schemes.some((s) => s.id === prev.schemeId) ? prev.schemeId : data.schemes[0]?.id ?? 1,
        academicYearId: data.academicYears.some((a) => a.id === prev.academicYearId) ? prev.academicYearId : data.academicYears.find((a) => a.is_current)?.id ?? data.academicYears[0]?.id ?? 1,
        branchId: data.branches.some((b) => b.id === prev.branchId) ? prev.branchId : data.branches.find((b) => b.code === 'CSE')?.id ?? data.branches[0]?.id ?? 1,
        semesterId: data.semesters.some((s) => s.id === prev.semesterId) ? prev.semesterId : data.semesters.find((s) => s.number === 3)?.id ?? data.semesters[0]?.id ?? 1,
      }));
    } catch (err) {
      console.error('Failed to load Supabase hierarchy:', err);
    }
  };

  useEffect(() => {
    void refreshHierarchy();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setStudentUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        setAdminUser(null);
        setBookmarks([]);
        setCompletedTopicIds([]);
        setPracticedQuestionIds([]);
        return;
      }
      if (session?.user) {
        queueMicrotask(() => {
          api.adminMe().then(({ user }) => setAdminUser(user)).catch(() => setAdminUser(null));
        });
      } else {
        setAdminUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!studentUser) return;
    let cancelled = false;
    void api.getStudentRecords(studentUser.id).then(async (records) => {
      if (cancelled) return;
      const cloudKeys = new Set(records.map((record) => record.record_key));
      const localRecords = makeStudentRecords(studentUser.id,
        loadJson<BookmarkEntry[]>(BOOKMARKS_KEY, []),
        loadJson<number[]>(TOPICS_KEY, []),
        loadJson<number[]>(PRACTICED_KEY, []));
      const localOnly = localRecords.filter((record) => !cloudKeys.has(record.record_key));
      if (localOnly.length) {
        await Promise.all(localOnly.map(({ record_key, record_type, payload }) => api.saveStudentRecord({ record_key, record_type, payload })));
      }
      if (localRecords.length) {
        localStorage.removeItem(BOOKMARKS_KEY);
        localStorage.removeItem(TOPICS_KEY);
        localStorage.removeItem(PRACTICED_KEY);
      }
      if (cancelled) return;
      const merged = [...records, ...localOnly];
      setBookmarks(merged.filter((r) => r.record_type === 'bookmark').map((r) => r.payload as unknown as BookmarkEntry));
      setCompletedTopicIds(merged.filter((r) => r.record_type === 'topic_complete').map((r) => Number(r.payload.topic_id)));
      setPracticedQuestionIds(merged.filter((r) => r.record_type === 'question_practiced').map((r) => Number(r.payload.question_id)));
    }).catch((err) => console.error('Could not load account progress from Supabase:', err));
    return () => { cancelled = true; };
  }, [studentUser?.id]);

  const toggleDarkMode = () => setDarkMode((value) => !value);
  const setSelection = (next: Partial<HierarchySelection>) => setSelectionState((prev) => ({ ...prev, ...next }));
  const isBookmarked = (key: string) => bookmarks.some((bookmark) => bookmark.key === key);

  const toggleBookmark = (entry: Omit<BookmarkEntry, 'savedAt'>) => {
    const old = bookmarks.some((bookmark) => bookmark.key === entry.key);
    if (old) {
      setBookmarks((prev) => prev.filter((bookmark) => bookmark.key !== entry.key));
      if (studentUser) void api.deleteStudentRecord(`bookmark:${entry.key}`).catch(console.error);
    } else {
      const saved = { ...entry, savedAt: new Date().toISOString() };
      setBookmarks((prev) => [saved, ...prev]);
      if (studentUser) void api.saveStudentRecord({ record_key: `bookmark:${entry.key}`, record_type: 'bookmark', payload: saved as unknown as Record<string, unknown> }).catch(console.error);
    }
  };

  const toggleTopicComplete = (topicId: number) => {
    const complete = completedTopicIds.includes(topicId);
    setCompletedTopicIds((prev) => complete ? prev.filter((id) => id !== topicId) : [...prev, topicId]);
    if (studentUser) {
      const operation = complete ? api.deleteStudentRecord(`topic:${topicId}`) : api.saveStudentRecord({ record_key: `topic:${topicId}`, record_type: 'topic_complete', payload: { topic_id: topicId } });
      void operation.catch(console.error);
    }
  };

  const markQuestionPracticed = (questionId: number) => {
    if (practicedQuestionIds.includes(questionId)) return;
    setPracticedQuestionIds((prev) => [...prev, questionId]);
    if (studentUser) void api.saveStudentRecord({ record_key: `question:${questionId}`, record_type: 'question_practiced', payload: { question_id: questionId } }).catch(console.error);
  };

  const clearStudentProgress = () => {
    setBookmarks([]);
    setCompletedTopicIds([]);
    setPracticedQuestionIds([]);
    if (studentUser) void api.clearStudentRecords().catch(console.error);
  };

  const setAdminSession = (user: AdminUser | null, _token: string | null) => {
    setAdminUser(user);
    if (!user && supabase) void api.signOut().catch(console.error);
  };

  return (
    <StudyContext.Provider value={{
      darkMode, toggleDarkMode, hierarchy, selection, setSelection, refreshHierarchy,
      bookmarks, isBookmarked, toggleBookmark, completedTopicIds, toggleTopicComplete,
      practicedQuestionIds, markQuestionPracticed, clearStudentProgress, studentUser,
      authConfigured: isSupabaseConfigured, adminUser, setAdminSession,
    }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within StudyProvider');
  return context;
}
