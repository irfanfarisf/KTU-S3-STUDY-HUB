import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  FileCode2,
  FileUp,
  HelpCircle,
  Layers,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import type { ModuleItem, ProgramItem, Question, Resource, RevisionItem, Subject, Topic } from '@shared/types';
import { api } from '@/lib/api';
import { GENERATED_S3_PACK } from '@/data/generatedS3Pack';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { RESOURCE_TYPE_LABELS } from '@/lib/utils';

type AdminTab =
  | 'subjects'
  | 'modules_topics'
  | 'resources'
  | 'questions'
  | 'programs_revision'
  | 'hierarchy'
  | 'bulk';

export function AdminDashboardPage() {
  const { hierarchy, refreshHierarchy, adminUser, setAdminSession } = useStudy();

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // CMS state
  const [tab, setTab] = useState<AdminTab>('subjects');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjectSyllabus, setSubjectSyllabus] = useState<{ file_path: string; file_name: string; is_published: boolean; title: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [revisionItems, setRevisionItems] = useState<RevisionItem[]>([]);
  const [cmsSearch, setCmsSearch] = useState('');
  const [resourceCategoryFilter, setResourceCategoryFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [resourceModuleFilter, setResourceModuleFilter] = useState('all');

  // Form states: Subject
  const [subForm, setSubForm] = useState({
    code: '',
    name: '',
    short_description: '',
    course_type: 'Theory',
    credits: 3,
    cie_marks: 40,
    ese_marks: 60,
    content_focus: 'theory',
    branch_id: 1,
    semester_id: 3,
  });

  // Form states: Module & Topic
  const [modForm, setModForm] = useState({
    module_number: 1,
    title: '',
    description: '',
    estimated_hours: 10,
  });
  const [topicForm, setTopicForm] = useState({
    module_id: '',
    title: '',
    summary: '',
    importance: 'must_study',
    content_type: 'theory',
  });

  // Form states: Resource + PDF upload
  const [resForm, setResForm] = useState({
    module_id: '',
    title: '',
    description: '',
    resource_type: 'exam_notes',
    source_category: 'simplified_ai_notes',
    importance: 'must_study',
    exam_type: '',
    exam_year: '',
    content_markdown: '',
    file_url: '',
    file_path: '',
    file_name: '',
    file_size_bytes: 0,
    mime_type: '',
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [resourceEntryMode, setResourceEntryMode] = useState<'custom' | 'upload'>('custom');
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('KTU Notes');
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadPublished, setUploadPublished] = useState(true);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadOverrides, setUploadOverrides] = useState<Record<string, { title: string; category: string }>>({});
  const uploadKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

  // Form states: Question
  const [qForm, setQForm] = useState({
    module_id: '',
    question_text: '',
    question_type: 'short_answer',
    marks: 3,
    difficulty: 'medium',
    importance: 'must_study',
    source_label: 'Practice Bank',
    exam_year: '',
    is_important: true,
    short_answer: '',
    detailed_explanation: '',
    code_snippet: '',
  });

  // Form states: Program & Revision
  const [progForm, setProgForm] = useState({
    module_id: '',
    title: '',
    problem_statement: '',
    language: 'java',
    code: '',
    sample_output: '',
    explanation: '',
    importance: 'must_study',
  });
  const [revForm, setRevForm] = useState({
    module_id: '',
    category: 'definition',
    title: '',
    content_markdown: '',
    code_snippet: '',
    importance: 'must_study',
  });

  // Hierarchy forms
  const [branchForm, setBranchForm] = useState({ name: '', code: '', short_name: '', description: '' });
  const [semForm, setSemForm] = useState({ number: 5, label: 'Semester 5 (S5)', code: 'S5' });

  // Bulk import
  const [bulkEntity, setBulkEntity] = useState<'questions' | 'topics' | 'resources' | 'programs' | 'revision_items'>('questions');
  const [bulkModuleId, setBulkModuleId] = useState('');
  const [publishingGeneratedPack, setPublishingGeneratedPack] = useState(false);
  const [bulkJson, setBulkJson] = useState(
    JSON.stringify(
      [
        {
          question_text: 'Sample question: Define Polymorphism in Java.',
          question_type: 'definition',
          marks: 3,
          importance: 'must_study',
          short_answer: 'Polymorphism allows one interface or method name to take multiple forms (overloading and overriding).',
        },
      ],
      null,
      2
    )
  );

  const notify = (type: 'ok' | 'err', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4500);
  };

  const loadSubjects = useCallback(async () => {
    const list = await api.getSubjects({ includeUnpublished: true });
    setSubjects(list);
    if (list.length > 0 && (!selectedSubjectId || !list.some((s) => s.id === selectedSubjectId))) {
      setSelectedSubjectId(list[0].id);
    }
  }, [selectedSubjectId]);

  const loadSubjectScopedData = useCallback(async (subId: number) => {
    if (!subId) return;
    try {
      const [detail, resList, qList, pList, rList] = await Promise.all([
        api.getSubjectDetail(subId),
        api.getResources({ subjectId: subId, includeUnpublished: true }),
        api.getQuestions({ subjectId: subId, includeUnpublished: true }),
        api.getPrograms({ subjectId: subId, includeUnpublished: true }),
        api.getRevisionItems({ subjectId: subId, includeUnpublished: true }),
      ]);
      setModules(detail.modules);
      setTopics(detail.topics);
      setResources(resList);
      setSubjectSyllabus(detail.syllabus);
      setQuestions(qList);
      setPrograms(pList);
      setRevisionItems(rList);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (adminUser) {
      loadSubjects();
    }
  }, [adminUser, loadSubjects]);

  useEffect(() => {
    if (adminUser && selectedSubjectId) {
      loadSubjectScopedData(selectedSubjectId);
    }
  }, [adminUser, selectedSubjectId, loadSubjectScopedData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await api.adminLogin(email, password);
      setAdminSession(res.user, res.token);
    } catch (err) {
      setLoginError((err as Error).message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const uploaded = await api.uploadFile(file);
      setResForm((f) => ({
        ...f,
        file_url: uploaded.file_url,
        file_path: uploaded.file_path,
        file_name: uploaded.file_name,
        file_size_bytes: uploaded.file_size_bytes,
        mime_type: uploaded.mime_type,
      }));
      notify('ok', `Uploaded ${uploaded.file_name}`);
    } catch (err) {
      notify('err', (err as Error).message);
    } finally {
      setUploadingFile(false);
    }
  };

  const publishGeneratedPack = async () => {
    const subject = subjects.find((row) => row.id === selectedSubjectId);
    const pack = subject ? GENERATED_S3_PACK[subject.code] : null;
    if (!subject || !pack) {
      notify('err', 'The generated study pack is not configured for this subject.');
      return;
    }
    setPublishingGeneratedPack(true);
    try {
      const detail = await api.getSubjectDetail(subject.id);
      const moduleNumberExists = (number: number) => detail.modules.some((module) => module.module_number === number);
      const notes = pack.filter((item) => moduleNumberExists(item.module_number) && !resources.some((row) => row.title === `Generated Exam Notes — Module ${item.module_number}`)).map((item) => ({
        module_number: item.module_number,
        title: `Generated Exam Notes — Module ${item.module_number}`,
        description: `Original, syllabus-aligned revision notes for ${subject.code} Module ${item.module_number}. Prepared by synthesizing the supplied KTU syllabus, notes, question bank and exam papers.`,
        resource_type: 'exam_notes', source_category: 'simplified_ai_notes', importance: 'important', content_format: 'markdown', content_markdown: item.note, is_published: true,
      }));
      const newQuestions = pack.filter((item) => moduleNumberExists(item.module_number) && !questions.some((row) =>
        row.module_id === detail.modules.find((module) => module.module_number === item.module_number)?.id &&
        row.question_text === item.question && row.source_label === 'Generated S3 Study Pack — syllabus/source synthesis'
      )).map((item) => ({
        module_number: item.module_number,
        question_text: item.question,
        question_type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study',
        source_label: 'Generated S3 Study Pack — syllabus/source synthesis', source_category: 'practice_material', is_important: true,
        short_answer: item.answer, detailed_explanation: item.answer, expected_marks: 5, is_published: true,
      }));
      const appliedExamples = pack.filter((item) => moduleNumberExists(item.module_number) && !programs.some((row) => row.title === `Worked Example — Module ${item.module_number}`)).map((item) => ({
        module_number: item.module_number, title: `Worked Example — Module ${item.module_number}`, description: item.problem,
        problem_statement: item.problem, language: 'text', code: item.workedExample, explanation: item.workedExample,
        importance: 'important', is_published: true,
      }));
      const cards = pack.flatMap((item) => [
        { module_number: item.module_number, title: item.revisionTitle, content_markdown: item.revision, category: 'concept', importance: 'must_study', is_published: true },
        { module_number: item.module_number, title: item.revision2Title, content_markdown: item.revision2, category: 'concept', importance: 'important', is_published: true },
      ]).filter((item) => moduleNumberExists(item.module_number) && !revisionItems.some((row) => row.title === item.title));
      const operations = [
        ['resources', notes], ['questions', newQuestions], ['programs', appliedExamples], ['revision_items', cards],
      ] as const;
      let inserted = 0;
      for (const [entityType, items] of operations) {
        if (items.length) {
          const result = await api.bulkImport({ entityType, subjectId: subject.id, items });
          inserted += result.inserted;
        }
      }
      await loadSubjectScopedData(subject.id);
      await loadSubjects();
      notify('ok', inserted ? `Published ${inserted} generated items for ${subject.code}.` : `Generated pack for ${subject.code} is already complete.`);

    } catch (err) {
      notify('err', `Generated pack import stopped: ${(err as Error).message}`);
    } finally {
      setPublishingGeneratedPack(false);
    }
  };

  if (!adminUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Admin CMS Login
                </h1>
                <p className="text-xs text-slate-500">
                  Manage subjects, modules, PDFs, PYQs &amp; question banks
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Admin Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
              </div>

              {loginError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                  {loginError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loggingIn}>
                {loggingIn ? 'Signing in...' : 'Sign In to Admin Dashboard'}
              </Button>
            </form>

            {import.meta.env.DEV && (
              <p className="mt-5 text-xs text-slate-500">
                Admin accounts are managed in Supabase Auth and must be listed in the public.admins table.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'modules_topics', label: 'Modules & Topics', icon: Layers },
    { id: 'resources', label: 'Notes, PDFs & PYQs', icon: FileUp },
    { id: 'questions', label: 'Questions & Answers', icon: HelpCircle },
    { id: 'programs_revision', label: 'Programs & Revision', icon: FileCode2 },
    { id: 'hierarchy', label: 'Branches & Sems', icon: Plus },
    { id: 'bulk', label: 'Bulk Import', icon: Upload },
  ];

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Centralised Content Management System
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Signed in as {adminUser.email} • Add new subjects &amp; content without editing code
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdminSession(null, null)}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mt-4 rounded-xl border p-3 text-xs font-medium ${
            statusMsg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* CMS Tabs */}
      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium cursor-pointer ${
              tab === t.id
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Subject Selector for scoped tabs */}
      {['modules_topics', 'resources', 'questions', 'programs_revision', 'bulk'].includes(tab) && (
        <Card className="mt-3">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Target Subject:
              </span>
              <Select
                value={String(selectedSubjectId)}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                className="w-auto min-w-[260px]"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.code} — {s.name} ({s.semester_code} • {s.branch_code})
                  </option>
                ))}
              </Select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={cmsSearch}
                onChange={(e) => setCmsSearch(e.target.value)}
                placeholder="Filter items..."
                className="h-9 pl-8 text-xs"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 1: SUBJECTS */}
      {tab === 'subjects' && (
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Subject
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Dynamically add any KTU subject across branches or semesters.
              </p>

              <form
                className="mt-4 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createSubject({
                      university_id: hierarchy?.universities[0]?.id || 1,
                      scheme_id: hierarchy?.schemes[0]?.id || 1,
                      academic_year_id: hierarchy?.academicYears[0]?.id || 1,
                      branch_id: Number(subForm.branch_id),
                      semester_id: Number(subForm.semester_id),
                      code: subForm.code,
                      name: subForm.name,
                      short_description: subForm.short_description,
                      course_type: subForm.course_type,
                      credits: Number(subForm.credits),
                      cie_marks: Number(subForm.cie_marks),
                      ese_marks: Number(subForm.ese_marks),
                      content_focus: subForm.content_focus,
                    });
                    setSubForm((f) => ({ ...f, code: '', name: '', short_description: '' }));
                    await loadSubjects();
                    notify('ok', 'Subject created successfully.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={String(subForm.branch_id)}
                    onChange={(e) => setSubForm({ ...subForm, branch_id: Number(e.target.value) })}
                  >
                    {hierarchy?.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={String(subForm.semester_id)}
                    onChange={(e) => setSubForm({ ...subForm, semester_id: Number(e.target.value) })}
                  >
                    {hierarchy?.semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}
                      </option>
                    ))}
                  </Select>
                </div>

                <Input
                  placeholder="Subject Code (e.g., PCCST402)"
                  value={subForm.code}
                  onChange={(e) => setSubForm({ ...subForm, code: e.target.value })}
                  required
                />
                <Input
                  placeholder="Official Subject Name"
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  required
                />
                <Textarea
                  rows={2}
                  placeholder="Short description..."
                  value={subForm.short_description}
                  onChange={(e) => setSubForm({ ...subForm, short_description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={subForm.content_focus}
                    onChange={(e) => setSubForm({ ...subForm, content_focus: e.target.value })}
                  >
                    <option value="theory">Theory</option>
                    <option value="programming">Programming</option>
                    <option value="mathematical">Mathematical</option>
                    <option value="numerical">Numerical</option>
                    <option value="diagram">Diagram / Lab</option>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Credits"
                    value={subForm.credits}
                    onChange={(e) => setSubForm({ ...subForm, credits: Number(e.target.value) })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4" />
                  Create Subject
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
                Configured Subjects ({subjects.length})
              </h2>
              <div className="space-y-2.5">
                {subjects.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="indigo">{s.code}</Badge>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {s.name}
                        </span>
                        <Badge variant={s.is_published ? 'emerald' : 'outline'}>
                          {s.is_published ? 'Published' : 'Hidden'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {s.branch_code} • {s.semester_code} • {s.module_count || 0} modules •{' '}
                        {s.resource_count || 0} resources
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await api.updateSubject(s.id, { is_published: !s.is_published });
                          await loadSubjects();
                        }}
                      >
                        {s.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {s.is_published ? 'Hide' : 'Publish'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!window.confirm(`Delete subject ${s.code}?`)) return;
                          await api.deleteSubject(s.id);
                          await loadSubjects();
                          notify('ok', `Deleted ${s.code}`);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: MODULES & TOPICS */}
      {tab === 'modules_topics' && (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-base font-bold">
                Add Module to {activeSubject?.code}
              </h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createModule({
                      subject_id: selectedSubjectId,
                      ...modForm,
                    });
                    setModForm((m) => ({
                      ...m,
                      module_number: m.module_number + 1,
                      title: '',
                      description: '',
                    }));
                    await loadSubjectScopedData(selectedSubjectId);
                    notify('ok', 'Module added.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Mod #"
                    value={modForm.module_number}
                    onChange={(e) => setModForm({ ...modForm, module_number: Number(e.target.value) })}
                    required
                  />
                  <Input
                    className="col-span-2"
                    placeholder="Module Title"
                    value={modForm.title}
                    onChange={(e) => setModForm({ ...modForm, title: e.target.value })}
                    required
                  />
                </div>
                <Textarea
                  rows={2}
                  placeholder="Module syllabus & overview..."
                  value={modForm.description}
                  onChange={(e) => setModForm({ ...modForm, description: e.target.value })}
                />
                <Button type="submit" size="sm">
                  Add Module
                </Button>
              </form>

              <div className="mt-5 space-y-2">
                {modules.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                  >
                    <div>
                      <span className="font-bold">Module {m.module_number}:</span> {m.title}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteModule(m.id);
                        await loadSubjectScopedData(selectedSubjectId);
                      }}
                      className="text-rose-500 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-base font-bold">
                Add Topic to {activeSubject?.code}
              </h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createTopic({
                      subject_id: selectedSubjectId,
                      module_id: Number(topicForm.module_id || modules[0]?.id),
                      title: topicForm.title,
                      summary: topicForm.summary,
                      importance: topicForm.importance,
                      content_type: topicForm.content_type,
                    });
                    setTopicForm((t) => ({ ...t, title: '', summary: '' }));
                    await loadSubjectScopedData(selectedSubjectId);
                    notify('ok', 'Topic added.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <Select
                  value={topicForm.module_id || String(modules[0]?.id || '')}
                  onChange={(e) => setTopicForm({ ...topicForm, module_id: e.target.value })}
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Module {m.module_number}: {m.title}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Topic Title"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                  required
                />
                <Input
                  placeholder="Short topic summary..."
                  value={topicForm.summary}
                  onChange={(e) => setTopicForm({ ...topicForm, summary: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={topicForm.importance}
                    onChange={(e) => setTopicForm({ ...topicForm, importance: e.target.value })}
                  >
                    <option value="must_study">Must Study</option>
                    <option value="important">Important</option>
                    <option value="additional">Additional</option>
                  </Select>
                  <Select
                    value={topicForm.content_type}
                    onChange={(e) => setTopicForm({ ...topicForm, content_type: e.target.value })}
                  >
                    <option value="theory">Theory</option>
                    <option value="programming">Programming</option>
                    <option value="mathematical">Mathematical</option>
                    <option value="numerical">Numerical</option>
                    <option value="diagram">Diagram</option>
                    <option value="derivation">Derivation</option>
                  </Select>
                </div>
                <Button type="submit" size="sm">
                  Add Topic
                </Button>
              </form>

              <div className="mt-5 max-h-72 space-y-2 overflow-y-auto">
                {topics
                  .filter((t) => !cmsSearch || t.title.toLowerCase().includes(cmsSearch.toLowerCase()))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800"
                    >
                      <div>
                        <span className="font-semibold">{t.title}</span>
                        <span className="ml-2 text-slate-400">({t.importance})</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await api.deleteTopic(t.id);
                          await loadSubjectScopedData(selectedSubjectId);
                        }}
                        className="text-rose-500 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: RESOURCES, PDFS & PYQS */}
      {tab === 'resources' && (
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <div className="mb-4 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {(['custom', 'upload'] as const).map((mode) => <button key={mode} type="button" onClick={() => setResourceEntryMode(mode)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${resourceEntryMode === mode ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-950 dark:text-indigo-300' : 'text-slate-500'}`}>{mode === 'custom' ? 'Custom Entry' : 'Upload Files'}</button>)}
              </div>
              {resourceEntryMode === 'upload' ? <>
                <h2 className="text-base font-bold">Upload study resources</h2>
                <p className="mt-1 text-xs text-slate-500">Files are attached to {activeSubject?.code} ({activeSubject?.branch_code}, {activeSubject?.semester_code}).</p>
                <div className="mt-3 space-y-3">
                  <Select value={uploadModuleId} onChange={(e) => setUploadModuleId(e.target.value)}><option value="">Subject-wide</option>{modules.map((m) => <option key={m.id} value={m.id}>Module {m.module_number}: {m.title}</option>)}</Select>
                  <Select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>{['KTU Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources'].map((c) => <option key={c}>{c}</option>)}</Select>
                  <Input placeholder="Title (used for one file)" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                  <Textarea rows={2} placeholder="Description (optional)" value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} />
                  <label className="block cursor-pointer rounded-xl border-2 border-dashed border-indigo-300 p-5 text-center text-xs text-slate-600 dark:border-indigo-800 dark:text-slate-300" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setUploadQueue((q) => [...q, ...Array.from(e.dataTransfer.files)]); }}>
                    <Upload className="mx-auto mb-2 h-5 w-5 text-indigo-600" />Drop files here or <span className="font-semibold text-indigo-600">browse files</span><input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(e) => setUploadQueue((q) => [...q, ...Array.from(e.target.files || [])])} /><span className="mt-1 block text-[10px]">PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP • max 25 MB each</span>
                  </label>
                  {uploadQueue.map((f, i) => <div key={`${f.name}-${i}`} className="space-y-2 rounded-lg border p-2"><span className="block truncate text-xs">{f.name} · {(f.size / 1048576).toFixed(2)} MB</span><Input placeholder="Title (defaults to file name)" value={uploadOverrides[uploadKey(f)]?.title || ''} onChange={(e) => setUploadOverrides((v) => ({ ...v, [uploadKey(f)]: { title: e.target.value, category: v[uploadKey(f)]?.category || uploadCategory } }))} /><Select value={uploadOverrides[uploadKey(f)]?.category || uploadCategory} onChange={(e) => setUploadOverrides((v) => ({ ...v, [uploadKey(f)]: { title: v[uploadKey(f)]?.title || '', category: e.target.value } }))}>{['KTU Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources'].map((c) => <option key={c}>{c}</option>)}</Select><button type="button" onClick={() => setUploadQueue((q) => q.filter((_, n) => n !== i))} className="text-xs text-rose-600">Remove</button></div>)}
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={uploadPublished} onChange={(e) => setUploadPublished(e.target.checked)} />Publish immediately</label>
                  {uploadProgress && <p className="text-xs text-indigo-600">{uploadProgress}</p>}
                  <Button className="w-full" disabled={!uploadQueue.length || uploadingFile} onClick={async () => {
                    if (!uploadQueue.length) return;
                    setUploadingFile(true);
                    let completed = 0;
                    const filesToUpload = [...uploadQueue];
                    try {
                      for (const [index, file] of filesToUpload.entries()) {
                        setUploadProgress(`Uploading ${index + 1} of ${filesToUpload.length}: ${file.name}`);
                        const uploaded = await api.uploadFile(file);
                        const category = uploadOverrides[uploadKey(file)]?.category || uploadCategory;
                        const categoryType: Record<string, string> = {'KTU Notes':'original_notes','Handwritten Notes':'handwritten_notes','Previous Year Question Papers':'pyq','Model Question Papers':'model_paper','Solved Question Papers':'solved_paper','Question Banks':'exam_notes','Important Questions':'exam_notes','Reference Materials':'reference_notes','Assignments':'exam_notes','Other Resources':'exam_notes'};
                        await api.createResource({ subject_id: selectedSubjectId, module_id: uploadModuleId ? Number(uploadModuleId) : null, title: uploadOverrides[uploadKey(file)]?.title.trim() || (uploadQueue.length === 1 && uploadTitle.trim() ? uploadTitle.trim() : file.name.replace(/\.[^.]+$/, '')), description: uploadDescription, resource_type: categoryType[category], category, source_category: 'practice_material', importance: 'important', content_format: 'pdf', file_url: null, file_path: uploaded.file_path, file_name: uploaded.file_name, file_size_bytes: uploaded.file_size_bytes, mime_type: uploaded.mime_type, is_published: uploadPublished });
                        completed++;
                        setUploadQueue((queue) => queue.filter((queued) => uploadKey(queued) !== uploadKey(file)));
                      }
                      setUploadQueue([]); setUploadOverrides({}); setUploadTitle(''); setUploadDescription(''); setUploadProgress('');
                      await loadSubjectScopedData(selectedSubjectId); await loadSubjects();
                      notify('ok', `Uploaded ${completed} resource${completed === 1 ? '' : 's'}.`);
                    } catch (err) { notify('err', (err as Error).message); }
                    finally { setUploadingFile(false); }
                  }}>{uploadingFile ? 'Uploading…' : `Upload ${uploadQueue.length || ''} File${uploadQueue.length === 1 ? '' : 's'}`}</Button>
                </div>
              </> : <>
              <h2 className="text-base font-bold">
                Publish Resource / PDF ({activeSubject?.code})
              </h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createResource({
                      subject_id: selectedSubjectId,
                      module_id: resForm.module_id ? Number(resForm.module_id) : null,
                      title: resForm.title,
                      description: resForm.description,
                      resource_type: resForm.resource_type,
                      source_category: resForm.source_category,
                      importance: resForm.importance,
                      exam_type: resForm.exam_type || null,
                      exam_year: resForm.exam_year || null,
                      content_markdown: resForm.content_markdown || null,
                      file_url: resForm.file_url || null,
                      file_path: resForm.file_path || null,
                      file_name: resForm.file_name || null,
                      file_size_bytes: resForm.file_size_bytes || null,
                      mime_type: resForm.mime_type || null,
                    });
                    setResForm((f) => ({
                      ...f,
                      title: '',
                      description: '',
                      content_markdown: '',
                      file_url: '',
                      file_path: '',
                      file_name: '',
                      file_size_bytes: 0,
                    }));
                    await loadSubjectScopedData(selectedSubjectId);
                    await loadSubjects();
                    notify('ok', 'Resource published.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <Select
                  value={resForm.module_id}
                  onChange={(e) => setResForm({ ...resForm, module_id: e.target.value })}
                >
                  <option value="">Subject-wide (No specific module)</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Module {m.module_number}: {m.title}
                    </option>
                  ))}
                </Select>

                <Select
                  value={resForm.resource_type}
                  onChange={(e) => setResForm({ ...resForm, resource_type: e.target.value })}
                >
                  <option value="exam_notes">Simplified Exam Notes</option>
                  <option value="handwritten_notes">Handwritten Notes (PDF)</option>
                  <option value="original_notes">KTU Notes (PDF)</option>
                  <option value="reference_notes">Reference Notes</option>
                  <option value="syllabus">Official Syllabus</option>
                  <option value="pyq">Previous Year Question Paper (PYQ)</option>
                  <option value="model_paper">Model Question Paper</option>
                  <option value="solved_paper">Solved Question Paper</option>
                </Select>

                <Select
                  value={resForm.source_category}
                  onChange={(e) => setResForm({ ...resForm, source_category: e.target.value })}
                >
                  <option value="simplified_ai_notes">Simplified Exam Notes</option>
                  <option value="official_document">Official Document / Syllabus</option>
                  <option value="original_student_notes">Original Student Notes</option>
                  <option value="faculty_notes">Faculty / Classroom Notes</option>
                  <option value="practice_material">Practice Material</option>
                </Select>

                <Input
                  placeholder="Resource Title"
                  value={resForm.title}
                  onChange={(e) => setResForm({ ...resForm, title: e.target.value })}
                  required
                />
                <Input
                  placeholder="Short description..."
                  value={resForm.description}
                  onChange={(e) => setResForm({ ...resForm, description: e.target.value })}
                />

                {['pyq', 'model_paper', 'solved_paper'].includes(resForm.resource_type) && (
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={resForm.exam_type}
                      onChange={(e) => setResForm({ ...resForm, exam_type: e.target.value })}
                    >
                      <option value="">Exam Type</option>
                      <option value="regular">Regular</option>
                      <option value="supplementary">Supplementary</option>
                      <option value="model">Model</option>
                      <option value="verified">Verified</option>
                    </Select>
                    <Input
                      placeholder="Exam Year (e.g., Dec 2025)"
                      value={resForm.exam_year}
                      onChange={(e) => setResForm({ ...resForm, exam_year: e.target.value })}
                    />
                  </div>
                )}

                <div className="rounded-xl border border-dashed border-slate-300 p-3 text-xs dark:border-slate-700">
                  <label className="block font-medium text-slate-700 dark:text-slate-300">
                    Upload PDF / File (optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.md,.txt"
                    onChange={handleFileUpload}
                    className="mt-1.5 block w-full text-xs"
                  />
                  {uploadingFile && <span className="text-indigo-600">Uploading...</span>}
                  {resForm.file_name && (
                    <div className="mt-1 text-emerald-600">Attached: {resForm.file_name}</div>
                  )}
                </div>

                <Textarea
                  rows={4}
                  placeholder="Markdown notes content (optional if uploading PDF)..."
                  value={resForm.content_markdown}
                  onChange={(e) => setResForm({ ...resForm, content_markdown: e.target.value })}
                />

                <Button type="submit" className="w-full">
                  Publish Resource
                </Button>
              </form>
              </>}
              <div className="mt-5 border-t pt-4 dark:border-slate-800">
                <h3 className="text-sm font-bold">Official Syllabus PDF</h3>
                <p className="mt-1 text-xs text-slate-500">Separate PDF attachment for this subject.</p>
                {subjectSyllabus && <p className="my-2 truncate text-xs">{subjectSyllabus.file_name} · {subjectSyllabus.is_published ? 'Published' : 'Draft'}</p>}
                <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs font-medium"><FileUp className="mr-1 h-3.5 w-3.5"/>{subjectSyllabus ? 'Replace syllabus PDF' : 'Upload syllabus PDF'}<input type="file" accept=".pdf,application/pdf" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const title = window.prompt('Optional syllabus title', subjectSyllabus?.title || 'Official Syllabus') || 'Official Syllabus'; const description = window.prompt('Optional description', '') || ''; await api.saveSyllabus(selectedSubjectId, file, { title, description, is_published: true }); await loadSubjectScopedData(selectedSubjectId); notify('ok', 'Official syllabus uploaded.'); } catch (error) { notify('err', (error as Error).message); } finally { e.target.value = ''; } }} /></label>
                {subjectSyllabus && <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={async () => { const title = window.prompt('Syllabus title', subjectSyllabus.title); if (title === null) return; const description = window.prompt('Syllabus description', ''); await api.updateSyllabusMetadata(selectedSubjectId, { title, description: description || '' }); await loadSubjectScopedData(selectedSubjectId); }}>Edit details</Button><Button size="sm" variant="outline" onClick={async () => { await api.setSyllabusPublished(selectedSubjectId, !subjectSyllabus.is_published); await loadSubjectScopedData(selectedSubjectId); }}> {subjectSyllabus.is_published ? 'Unpublish' : 'Publish'} </Button><Button size="sm" variant="ghost" onClick={async () => { if (!window.confirm('Delete the official syllabus PDF?')) return; await api.deleteSyllabus(selectedSubjectId); await loadSubjectScopedData(selectedSubjectId); notify('ok', 'Syllabus deleted.'); }}><Trash2 className="h-4 w-4 text-rose-500"/>Delete</Button></div>}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <h2 className="mb-3 text-base font-bold">
                Resources for {activeSubject?.code} ({resources.length})
              </h2>
              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <Select value={resourceModuleFilter} onChange={(e) => setResourceModuleFilter(e.target.value)}><option value="all">All modules</option><option value="none">Subject-wide</option>{modules.map((m) => <option key={m.id} value={String(m.id)}>Module {m.module_number}</option>)}</Select>
                <Select value={resourceCategoryFilter} onChange={(e) => setResourceCategoryFilter(e.target.value)}><option value="all">All categories</option>{['KTU Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources'].map((c) => <option key={c}>{c}</option>)}</Select>
                <Select value={resourceTypeFilter} onChange={(e) => setResourceTypeFilter(e.target.value)}><option value="all">All file types</option>{['pdf','doc','docx','jpg','jpeg','png','webp'].map((ext) => <option key={ext} value={ext}>{ext.toUpperCase()}</option>)}</Select>
              </div>
              <div className="space-y-2.5">
                {resources
                  .filter(
                    (r) =>
                      !cmsSearch ||
                      r.title.toLowerCase().includes(cmsSearch.toLowerCase()) ||
                      r.resource_type.includes(cmsSearch.toLowerCase())
                  )
                  .filter((r) => resourceCategoryFilter === 'all' || r.category === resourceCategoryFilter)
                  .filter((r) => resourceModuleFilter === 'all' || (resourceModuleFilter === 'none' ? !r.module_id : String(r.module_id) === resourceModuleFilter))
                  .filter((r) => resourceTypeFilter === 'all' || r.file_name?.toLowerCase().endsWith(`.${resourceTypeFilter}`))
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="blue">{RESOURCE_TYPE_LABELS[r.resource_type]}</Badge>
                          {r.module_number && <Badge variant="outline">M{r.module_number}</Badge>}
                          <Badge variant={r.is_published ? 'emerald' : 'outline'}>
                            {r.is_published ? 'Live' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">{r.title}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const title = window.prompt('Resource title', r.title);
                            if (!title?.trim()) return;
                            const description = window.prompt('Description', r.description || '');
                            const category = window.prompt('Category', r.category || 'Other Resources');
                            const categoryType: Record<string, string> = {'KTU Notes':'original_notes','Handwritten Notes':'handwritten_notes','Previous Year Question Papers':'pyq','Model Question Papers':'model_paper','Solved Question Papers':'solved_paper','Question Banks':'exam_notes','Reference Materials':'reference_notes'};
                            await api.patchResource(r.id, { title: title.trim(), description: description ?? r.description, category: category || r.category, resource_type: categoryType[category || ''] || r.resource_type });
                            await loadSubjectScopedData(selectedSubjectId);
                          }}
                        >Edit</Button>
                        {r.file_path && <label className="inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs font-medium"><FileUp className="mr-1 h-3.5 w-3.5"/>Replace<input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { await api.replaceResourceFile(r.id, file); await loadSubjectScopedData(selectedSubjectId); notify('ok', 'Resource file replaced.'); } catch (error) { notify('err', (error as Error).message); } finally { e.target.value = ''; } }} /></label>}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await api.patchResource(r.id, { is_published: !r.is_published });
                            await loadSubjectScopedData(selectedSubjectId);
                          }}
                        >
                          {r.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await api.deleteResource(r.id);
                            await loadSubjectScopedData(selectedSubjectId);
                            await loadSubjects();
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: QUESTIONS & ANSWERS */}
      {tab === 'questions' && (
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="p-5">
              <h2 className="text-base font-bold">
                Add Question &amp; Answer ({activeSubject?.code})
              </h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createQuestion({
                      ...qForm,
                      subject_id: selectedSubjectId,
                      module_id: qForm.module_id ? Number(qForm.module_id) : null,
                    });
                    setQForm((f) => ({
                      ...f,
                      question_text: '',
                      short_answer: '',
                      detailed_explanation: '',
                      code_snippet: '',
                    }));
                    await loadSubjectScopedData(selectedSubjectId);
                    await loadSubjects();
                    notify('ok', 'Question saved.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <Select
                  value={qForm.module_id}
                  onChange={(e) => setQForm({ ...qForm, module_id: e.target.value })}
                >
                  <option value="">Select Module (optional)</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Module {m.module_number}: {m.title}
                    </option>
                  ))}
                </Select>
                <Textarea
                  rows={2}
                  placeholder="Question text..."
                  value={qForm.question_text}
                  onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={qForm.question_type}
                    onChange={(e) => setQForm({ ...qForm, question_type: e.target.value })}
                  >
                    <option value="short_answer">Short Answer</option>
                    <option value="descriptive">Descriptive</option>
                    <option value="definition">Definition</option>
                    <option value="programming">Programming</option>
                    <option value="numerical">Numerical</option>
                    <option value="comparison">Comparison</option>
                    <option value="diagram">Diagram</option>
                    <option value="problem_solving">Problem Solving</option>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Marks"
                    value={qForm.marks}
                    onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) })}
                  />
                </div>
                <Textarea
                  rows={2}
                  placeholder="Short exam-friendly answer..."
                  value={qForm.short_answer}
                  onChange={(e) => setQForm({ ...qForm, short_answer: e.target.value })}
                />
                <Textarea
                  rows={2}
                  placeholder="Code snippet (optional)..."
                  value={qForm.code_snippet}
                  onChange={(e) => setQForm({ ...qForm, code_snippet: e.target.value })}
                />
                <Button type="submit" className="w-full">
                  Add Question
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <h2 className="mb-3 text-base font-bold">
                Questions ({questions.length})
              </h2>
              <div className="space-y-2.5">
                {questions
                  .filter(
                    (q) =>
                      !cmsSearch ||
                      q.question_text.toLowerCase().includes(cmsSearch.toLowerCase())
                  )
                  .map((q) => (
                    <div
                      key={q.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                    >
                      <div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="blue">{q.question_type}</Badge>
                          {q.module_number && <Badge variant="outline">M{q.module_number}</Badge>}
                          {q.is_solved && <Badge variant="emerald">Solved</Badge>}
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-slate-900 dark:text-white">
                          {q.question_text}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await api.deleteQuestion(q.id);
                          await loadSubjectScopedData(selectedSubjectId);
                          await loadSubjects();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: PROGRAMS & QUICK REVISION */}
      {tab === 'programs_revision' && (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <FileCode2 className="h-4 w-4 text-indigo-600" />
                Add Programming / Code Example ({programs.length})
              </h2>
              <form
                className="mt-3 space-y-2.5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createProgram({
                      ...progForm,
                      subject_id: selectedSubjectId,
                      module_id: progForm.module_id ? Number(progForm.module_id) : null,
                    });
                    setProgForm((p) => ({
                      ...p,
                      title: '',
                      problem_statement: '',
                      code: '',
                      sample_output: '',
                    }));
                    await loadSubjectScopedData(selectedSubjectId);
                    notify('ok', 'Program added.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <Select
                  value={progForm.module_id}
                  onChange={(e) => setProgForm({ ...progForm, module_id: e.target.value })}
                >
                  <option value="">Select Module</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      Module {m.module_number}: {m.title}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Program Title"
                  value={progForm.title}
                  onChange={(e) => setProgForm({ ...progForm, title: e.target.value })}
                  required
                />
                <Input
                  placeholder="Problem Statement"
                  value={progForm.problem_statement}
                  onChange={(e) => setProgForm({ ...progForm, problem_statement: e.target.value })}
                />
                <Textarea
                  rows={4}
                  placeholder="Source Code..."
                  value={progForm.code}
                  onChange={(e) => setProgForm({ ...progForm, code: e.target.value })}
                  required
                />
                <Input
                  placeholder="Sample Output"
                  value={progForm.sample_output}
                  onChange={(e) => setProgForm({ ...progForm, sample_output: e.target.value })}
                />
                <Button type="submit" size="sm">
                  Add Program
                </Button>
              </form>

              <div className="mt-4 space-y-2">
                {programs.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800"
                  >
                    <span className="font-medium">{p.title}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteProgram(p.id);
                        await loadSubjectScopedData(selectedSubjectId);
                      }}
                      className="text-rose-500 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Zap className="h-4 w-4 text-indigo-600" />
                Add Quick Revision Card ({revisionItems.length})
              </h2>
              <form
                className="mt-3 space-y-2.5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createRevisionItem({
                      ...revForm,
                      subject_id: selectedSubjectId,
                      module_id: revForm.module_id ? Number(revForm.module_id) : null,
                    });
                    setRevForm((r) => ({ ...r, title: '', content_markdown: '', code_snippet: '' }));
                    await loadSubjectScopedData(selectedSubjectId);
                    notify('ok', 'Revision card added.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={revForm.module_id}
                    onChange={(e) => setRevForm({ ...revForm, module_id: e.target.value })}
                  >
                    <option value="">Module (optional)</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        Module {m.module_number}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={revForm.category}
                    onChange={(e) => setRevForm({ ...revForm, category: e.target.value })}
                  >
                    <option value="definition">Definition</option>
                    <option value="concept">Concept</option>
                    <option value="formula">Formula</option>
                    <option value="syntax">Syntax</option>
                    <option value="comparison">Comparison</option>
                    <option value="faq">FAQ</option>
                  </Select>
                </div>
                <Input
                  placeholder="Card Title"
                  value={revForm.title}
                  onChange={(e) => setRevForm({ ...revForm, title: e.target.value })}
                  required
                />
                <Textarea
                  rows={4}
                  placeholder="Compact markdown content..."
                  value={revForm.content_markdown}
                  onChange={(e) => setRevForm({ ...revForm, content_markdown: e.target.value })}
                  required
                />
                <Button type="submit" size="sm">
                  Add Revision Card
                </Button>
              </form>

              <div className="mt-4 space-y-2">
                {revisionItems.map((ri) => (
                  <div
                    key={ri.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800"
                  >
                    <span className="font-medium">{ri.title}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.deleteRevisionItem(ri.id);
                        await loadSubjectScopedData(selectedSubjectId);
                      }}
                      className="text-rose-500 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: BRANCHES & SEMESTERS */}
      {tab === 'hierarchy' && (
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-base font-bold">Add Engineering Branch</h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createBranch(branchForm);
                    setBranchForm({ name: '', code: '', short_name: '', description: '' });
                    await refreshHierarchy();
                    notify('ok', 'Branch added.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <Input
                  placeholder="Branch Code (e.g., ECE)"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  required
                />
                <Input
                  placeholder="Branch Full Name"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  required
                />
                <Input
                  placeholder="Description"
                  value={branchForm.description}
                  onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
                />
                <Button type="submit" size="sm">
                  Add Branch
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-base font-bold">Add Semester</h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.createSemester(semForm);
                    await refreshHierarchy();
                    notify('ok', 'Semester added.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
              >
                <Input
                  type="number"
                  placeholder="Semester Number (e.g., 5)"
                  value={semForm.number}
                  onChange={(e) => setSemForm({ ...semForm, number: Number(e.target.value) })}
                  required
                />
                <Input
                  placeholder="Code (e.g., S5)"
                  value={semForm.code}
                  onChange={(e) => setSemForm({ ...semForm, code: e.target.value })}
                  required
                />
                <Input
                  placeholder="Label (e.g., Semester 5 (S5))"
                  value={semForm.label}
                  onChange={(e) => setSemForm({ ...semForm, label: e.target.value })}
                  required
                />
                <Button type="submit" size="sm">
                  Add Semester
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 7: BULK IMPORT */}
      {tab === 'bulk' && (
        <Card className="mt-5">
          <CardContent className="p-5">
            <h2 className="text-base font-bold">
              Bulk Resource / Question Import ({activeSubject?.code})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Paste a JSON array of questions, topics, or markdown notes to import in one transaction.
            </p>
            {activeSubject && GENERATED_S3_PACK[activeSubject.code] && (
              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                <h3 className="text-sm font-semibold">Complete the generated study sections</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Publish original syllabus-aligned notes, solved practice questions, worked examples and quick-revision cards for all configured modules in {activeSubject.code}.
                </p>
                <Button className="mt-3" disabled={publishingGeneratedPack} onClick={publishGeneratedPack}>
                  <Zap className="h-4 w-4" />
                  {publishingGeneratedPack ? 'Publishing study pack…' : 'Publish generated study pack'}
                </Button>
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Select
                value={bulkEntity}
                onChange={(e) => setBulkEntity(e.target.value as 'questions' | 'topics' | 'resources' | 'programs' | 'revision_items')}
              >
                <option value="questions">Questions (+ Answers)</option>
                <option value="topics">Topics</option>
                <option value="resources">Simplified Notes / Resources</option>
                <option value="programs">Programs / Applied Examples</option>
                <option value="revision_items">Quick Revision Cards</option>
              </Select>
              <Select
                value={bulkModuleId}
                onChange={(e) => setBulkModuleId(e.target.value)}
              >
                <option value="">Default Module (optional)</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    Module {m.module_number}: {m.title}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea
              rows={10}
              className="mt-3 font-mono text-xs"
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
            />
            <Button
              className="mt-3"
              onClick={async () => {
                try {
                  const parsed = JSON.parse(bulkJson);
                  if (!Array.isArray(parsed)) throw new Error('JSON must be an array.');
                  const res = await api.bulkImport({
                    entityType: bulkEntity,
                    subjectId: selectedSubjectId,
                    moduleId: bulkModuleId ? Number(bulkModuleId) : null,
                    items: parsed,
                  });
                  await loadSubjectScopedData(selectedSubjectId);
                  await loadSubjects();
                  notify('ok', `Bulk imported ${res.inserted} items.`);
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
            >
              <Upload className="h-4 w-4" />
              Run Bulk Import
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
