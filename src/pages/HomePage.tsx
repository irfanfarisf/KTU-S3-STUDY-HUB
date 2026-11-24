import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, FileText, GraduationCap, Layers3, Search, Share2, Sparkles, UploadCloud } from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const features = [
  ['Subject-wise notes', 'Organized materials for focused study'], ['Previous year papers', 'Find past exam papers by subject'],
  ['Question banks', 'Practice questions and answers'], ['Revision materials', 'Quick revision resources where available'],
  ['PDF and document downloads', 'Preview and download published files'], ['Community contributions', 'Student resources reviewed before publication'],
];

export function HomePage() {
  const { hierarchy } = useStudy();
  const [branchId, setBranchId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const navigate = useNavigate();
  useEffect(() => { if (hierarchy) { setBranchId(String(hierarchy.branches.find(b => b.code === 'CSE')?.id ?? hierarchy.branches[0]?.id ?? '')); setSemesterId(String(hierarchy.semesters.find(s => s.number === 3)?.id ?? hierarchy.semesters[0]?.id ?? '')); } }, [hierarchy]);
  const explore = () => {
    const branch = hierarchy?.branches.find(b => String(b.id) === branchId);
    const sem = hierarchy?.semesters.find(s => String(s.id) === semesterId);
    if (branch && sem) navigate(`/academic/${encodeURIComponent(branch.code)}/${sem.number}`);
  };
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
    <section className="relative overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-100 px-6 py-14 text-center dark:border-slate-800 dark:from-slate-900 dark:via-indigo-950/50 dark:to-slate-900 sm:px-12 sm:py-20">
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-slate-900/80 dark:text-indigo-300"><GraduationCap className="h-4 w-4"/>Built for KTU B.Tech students</span>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-6xl">KTU STUDY HUB</h1>
      <p className="mt-3 text-lg font-semibold text-indigo-700 dark:text-indigo-300 sm:text-xl">Everything for your semester, in one place.</p>
      <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">Your academic resource hub for KTU B.Tech students. Explore notes, previous year question papers, question banks, revision materials and other study resources organized by branch and semester.</p>
      <Button className="mt-8" size="lg" onClick={() => document.getElementById('browse')?.scrollIntoView({behavior:'smooth'})}>Explore Your Semester <ArrowRight className="h-4 w-4"/></Button>
      <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3 text-left sm:gap-4">
        {[['8','Semesters'],[String(hierarchy?.branches.length ?? '—'),'Branches'],['1','Live academic section']].map(([value,label])=><div key={label} className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"><div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{value}</div><div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">{label}</div></div>)}
      </div>
    </section>
    <section id="browse" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center"><span className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">Start exploring</span><h2 className="mt-3 text-2xl font-bold sm:text-3xl">Choose Your Branch &amp; Semester</h2><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Browse available materials or see what is coming next.</p></div>
      <div className="mx-auto mt-8 grid max-w-3xl gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-7">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Branch<select value={branchId} onChange={e=>setBranchId(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{hierarchy?.branches.map(b=><option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Semester<select value={semesterId} onChange={e=>setSemesterId(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{hierarchy?.semesters.filter(s=>s.number>=1&&s.number<=8).map(s=><option key={s.id} value={s.id}>Semester {s.number} ({s.code})</option>)}</select></label>
        <Button className="h-12" onClick={explore} disabled={!branchId||!semesterId}>Open Section <ArrowRight className="h-4 w-4"/></Button>
      </div>
      <div className="mx-auto mt-5 grid max-w-3xl grid-cols-4 gap-2 sm:grid-cols-8">{hierarchy?.semesters.filter(s=>s.number>=1&&s.number<=8).map(s=><button key={s.id} onClick={()=>setSemesterId(String(s.id))} className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${semesterId===String(s.id)?'border-indigo-600 bg-indigo-600 text-white':'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900'}`}>{s.code}</button>)}</div>
    </section>
    <section className="grid items-center gap-8 rounded-3xl bg-slate-900 p-7 text-white dark:bg-slate-900 sm:grid-cols-2 sm:p-12"><div><span className="text-xs font-bold uppercase tracking-widest text-indigo-300">About the platform</span><h2 className="mt-3 text-2xl font-bold sm:text-3xl">A clearer way to find what you need.</h2></div><p className="text-sm leading-7 text-slate-300">KTU Study Hub is a student-focused academic resource platform designed to make studying easier for B.Tech students under APJ Abdul Kalam Technological University. The platform organizes academic materials by branch, semester, subject and module, helping students find useful resources in one place. Our goal is to make quality study materials more accessible to students.</p></section>
    <section className="py-16 sm:py-20"><div className="text-center"><h2 className="text-2xl font-bold sm:text-3xl">Study tools, organized around you</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Features appear as verified materials become available.</p></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{features.map(([title,desc],i)=><Card key={title}><CardContent className="flex gap-3 p-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">{[<BookOpen/>,<FileText/>,<Layers3/>,<Sparkles/>,<Search/>,<Share2/>][i]}</div><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p></div></CardContent></Card>)}</div></section>
    <section className="rounded-3xl border border-indigo-200 bg-indigo-50 p-7 dark:border-indigo-900 dark:bg-indigo-950/40 sm:flex sm:items-center sm:justify-between sm:p-10"><div><h2 className="text-xl font-bold">Help Build the KTU Study Hub</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Have useful notes, question papers or study materials? Share them with the KTU student community. Every submission is reviewed before it becomes publicly available.</p></div><Link to="/submit-resource" className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 sm:ml-6 sm:mt-0"><UploadCloud className="h-4 w-4"/>Submit a Resource</Link></section>
    <p className="mx-auto mt-10 max-w-3xl text-center text-[11px] leading-5 text-slate-400">KTU Study Hub is an independent student-oriented academic resource platform and is not an official website of APJ Abdul Kalam Technological University.</p>
  </div>;
}
