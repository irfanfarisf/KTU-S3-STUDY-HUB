import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, LogIn, LogOut, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useStudy } from '@/context/StudyContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export function AccountPage() {
  const { studentUser, authConfigured, adminUser } = useStudy();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>(params.get('recovery') === '1' ? 'recovery' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const data = await api.studentSignUp(email, password);
        setMessage(data.session
          ? 'Your account is ready. Your bookmarks and study progress now sync to this account.'
          : 'Check your email to confirm the account, then sign in here.');
      } else if (mode === 'signin') {
        await api.studentSignIn(email, password);
        setMessage('Signed in. Your saved study progress is syncing.');
      } else {
        await api.updatePassword(password);
        setMode('signin');
        setPassword('');
        setMessage('Password updated. You can keep using your account.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!authConfigured) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Card><CardContent className="p-6">
          <h1 className="text-xl font-bold">Student accounts are not configured</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Set the Supabase URL and anon key, then apply the database migrations to enable accounts and cloud-synced progress.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (studentUser && mode !== 'recovery') {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Card><CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"><BookOpen className="h-5 w-5" /></div>
            <div><h1 className="text-xl font-bold">Your study account</h1><p className="text-sm text-slate-500">Progress sync is on</p></div>
          </div>
          <p className="mt-5 text-sm text-slate-700 dark:text-slate-300">Signed in as <strong>{studentUser.email}</strong></p>
          <p className="mt-2 text-sm text-slate-500">Bookmarks, completed topics, and practiced questions are saved to your account and available on your other devices.</p>
          {adminUser && <Link to="/admin" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600"><ShieldCheck className="h-4 w-4" />Open content management</Link>}
          {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
          <Button className="mt-6" variant="outline" onClick={async () => { await api.signOut(); setMessage('Signed out.'); }}><LogOut className="h-4 w-4" />Sign out</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <Card><CardContent className="p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-3 text-white">{mode === 'signup' ? <UserRoundPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}</div>
          <div><h1 className="text-xl font-bold">{mode === 'signup' ? 'Create a study account' : mode === 'recovery' ? 'Choose a new password' : 'Sign in to sync progress'}</h1><p className="text-sm text-slate-500">Your study records follow your account across devices.</p></div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode !== 'recovery' && <div><label className="mb-1 block text-xs font-medium">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>}
          <div><label className="mb-1 block text-xs font-medium">{mode === 'recovery' ? 'New password' : 'Password'}</label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required /></div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'recovery' ? 'Update password' : 'Sign in'}</Button>
        </form>
        {mode === 'signin' && <button type="button" className="mt-3 text-xs text-indigo-600 hover:underline" onClick={async () => { if (!email) { setError('Enter your email first.'); return; } setBusy(true); setError(''); try { await api.sendPasswordReset(email); setMessage('Password reset instructions were sent if that email has an account.'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }}>Forgot password?</button>}
        <div className="mt-5 border-t border-slate-200 pt-4 text-center text-sm dark:border-slate-800">
          {mode === 'signin' ? <button type="button" className="text-indigo-600 hover:underline" onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Create an account</button> : mode === 'signup' ? <button type="button" className="text-indigo-600 hover:underline" onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Already registered? Sign in</button> : <button type="button" className="text-indigo-600 hover:underline" onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Back to sign in</button>}
        </div>
      </CardContent></Card>
    </div>
  );
}
