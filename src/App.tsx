import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
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
const AcademicSectionPage = lazy(() => import('@/pages/AcademicSectionPage').then((m) => ({ default: m.AcademicSectionPage })));
const SubmitResourcePage = lazy(() => import('@/pages/SubmitResourcePage').then((m) => ({ default: m.SubmitResourcePage })));

function AppLayout() {
  const location = useLocation();
  return <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <Navbar />
    {location.pathname !== '/' && <HierarchySelectorBar />}
    <main className="flex-1"><Suspense fallback={<PageFallback />}><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/academic/:branch/:semester" element={<AcademicSectionPage />} />
      <Route path="/submit-resource" element={<SubmitResourcePage />} />
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes></Suspense></main>
    <Footer />
  </div>;
}

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          The page you requested does not exist or may have been moved.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}

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
      <BrowserRouter><AppLayout /></BrowserRouter>
    </StudyProvider>
  );
}

export default App;
