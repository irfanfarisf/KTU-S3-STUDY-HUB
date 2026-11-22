import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StudyProvider } from '@/context/StudyContext';
import { Navbar } from '@/components/layout/Navbar';
import { HierarchySelectorBar } from '@/components/layout/HierarchySelectorBar';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { SubjectsPage } from '@/pages/SubjectsPage';
import { SubjectDetailPage } from '@/pages/SubjectDetailPage';
import { ModuleDetailPage } from '@/pages/ModuleDetailPage';
import { NotesLibraryPage } from '@/pages/NotesLibraryPage';
import { PyqLibraryPage } from '@/pages/PyqLibraryPage';
import { QuestionBankPage } from '@/pages/QuestionBankPage';
import { QuickRevisionPage } from '@/pages/QuickRevisionPage';
import { SearchPage } from '@/pages/SearchPage';
import { BookmarksProgressPage } from '@/pages/BookmarksProgressPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AccountPage } from '@/pages/AccountPage';

export function App() {
  return (
    <StudyProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          <Navbar />
          <HierarchySelectorBar />
          <main className="flex-1">
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
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </StudyProvider>
  );
}

export default App;
