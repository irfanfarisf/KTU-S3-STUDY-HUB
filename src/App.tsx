import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StudyProvider } from '@/context/StudyContext';
import { Navbar } from '@/components/layout/Navbar';
import { HierarchySelectorBar } from '@/components/layout/HierarchySelectorBar';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';

const SubjectsPage = lazy(() => import('@/pages/SubjectsPage').then((m) => ({ default: m.SubjectsPage })));
const SubjectDetailPage = lazy(() => import('@/pages/SubjectDetailPage').then((m) => ({ default: m.SubjectDetailPage })));
const ModuleDetailPage = lazy(() => import('@/pages/ModuleDetailPage').then((m) => ({ default: m.ModuleDetailPage })));
const NotesLibraryPage = lazy(() => import('@/pages/NotesLibraryPage').then((m) => ({ default: m.NotesLibraryPage })));
const PyqLibraryPage = lazy(() => import('@/pages/PyqLibraryPage').then((m) => ({ default: m.PyqLibraryPage })));
const QuestionBankPage = lazy(() => import('@/pages/QuestionBankPage').then((m) => ({ default: m.QuestionBankPage })));
const QuickRevisionPage = lazy(() => import('@/pages/QuickRevisionPage').then((m) => ({ default: m.QuickRevisionPage })));
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const BookmarksProgressPage = lazy(() => import('@/pages/BookmarksProgressPage').then((m) => ({ default: m.BookmarksProgressPage })));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })));

function PageFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export function App() {
  return (
    <StudyProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          <Navbar />
          <HierarchySelectorBar />
          <main className="flex-1">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/subjects/:code" element={<SubjectDetailPage />} />
                <Route path="/subjects/:code/module/:moduleNumber" element={<ModuleDetailPage />} />
                <Route path="/notes" element={<NotesLibraryPage />} />
                <Route path="/pyqs" element={<PyqLibraryPage />} />
                <Route path="/question-bank" element={<QuestionBankPage />} />
                <Route path="/quick-revision" element={<QuickRevisionPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/bookmarks" element={<BookmarksProgressPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/account" element={<AccountPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </StudyProvider>
  );
}

export default App;
