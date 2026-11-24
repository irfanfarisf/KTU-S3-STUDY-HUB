import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  FileText,
  GraduationCap,
  HelpCircle,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/notes', label: 'Notes', icon: FileText },
  { to: '/pyqs', label: 'PYQs', icon: GraduationCap },
  { to: '/question-bank', label: 'Question Bank', icon: HelpCircle },
  { to: '/quick-revision', label: 'Quick Revision', icon: Zap },
  { to: '/bookmarks', label: 'Progress', icon: Bookmark },
  { to: '/account', label: 'Account', icon: UserRound },
];

export function Navbar() {
  const { darkMode, toggleDarkMode, bookmarks, adminUser } = useStudy();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const navigate = useNavigate();

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search${quickQuery.trim() ? `?q=${encodeURIComponent(quickQuery.trim())}` : ''}`);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
              KTU Study Hub
            </div>
            <div className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:block">
              Everything for your semester, in one place.
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
              {item.to === '/bookmarks' && bookmarks.length > 0 && (
                <span className="ml-0.5 rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-semibold text-white">
                  {bookmarks.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleQuickSearch} className="relative hidden md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search subjects, topics..."
              aria-label="Global quick search"
              className="h-9 w-48 rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-900 xl:w-60"
            />
          </form>

          <Link
            to="/search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle dark mode"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            to="/admin"
            className={cn(
              'hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium sm:inline-flex',
              adminUser
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {adminUser ? 'CMS' : 'Admin'}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <form onSubmit={handleQuickSearch} className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Search subjects, modules, topics..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </form>
          <div className="grid grid-cols-2 gap-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin CMS
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
