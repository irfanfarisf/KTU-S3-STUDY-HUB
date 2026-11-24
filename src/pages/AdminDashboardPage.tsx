import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Bell,
  Check,
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
import { EXPANDED_S3_PACK } from '@/data/expandedS3Pack';
import { useStudy } from '@/context/StudyContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { RESOURCE_TYPE_LABELS } from '@/lib/utils';
import { getSupabase } from '@/lib/supabase';

type AdminTab =
  | 'subjects'
  | 'modules_topics'
  | 'resources'
  | 'questions'
  | 'programs_revision'
  | 'hierarchy'
  | 'bulk'
  | 'submissions';

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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionSubjects, setSubmissionSubjects] = useState<Record<string, string>>({});
  const [submissionNotes, setSubmissionNotes] = useState<Record<string, string>>({});
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [submissionBranchFilter, setSubmissionBranchFilter] = useState('all');
  const [submissionSemesterFilter, setSubmissionSemesterFilter] = useState('all');
  const [submissionCategoryFilter, setSubmissionCategoryFilter] = useState('all');
  const [submissionDateFilter, setSubmissionDateFilter] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
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

  const loadNotifications = useCallback(async () => {
    const { data, error } = await getSupabase().from('admin_notifications').select('*, submission:community_submissions(id,title,status,branch:branches(code),semester:semesters(code),subject_name,subject_code,created_at)').is('archived_at', null).order('created_at', { ascending: false }).limit(30);
    if (!error) setNotifications(data || []);
  }, []);
  const loadSubmissions = useCallback(async () => {
    const { data, error } = await getSupabase().from('community_submissions').select('*, branch:branches(id,name,code), semester:semesters(id,number,code), subject:subjects(id,code,name), notification:admin_notifications(id,read_at)').order('created_at', { ascending: false });
    if (!error) setSubmissions(data || []);
  }, []);
  useEffect(() => {
    if (!adminUser) return;
    void loadNotifications();
    const channel = getSupabase().channel('admin-submission-notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
      setNotifications((current) => [payload.new, ...current.filter((item) => item.id !== payload.new.id)]);
      setStatusMsg({ type: 'ok', text: 'A new resource submission is awaiting review.' });
      void loadNotifications();
      void loadSubmissions();
    }).subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  }, [adminUser?.id, loadNotifications, loadSubmissions]);
  useEffect(() => { if (tab === 'submissions' && adminUser) void loadSubmissions(); }, [tab, adminUser?.id, loadSubmissions]);

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
        api.getSubjectDetail(subId, true),
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
    const subjectCodes = Object.keys(EXPANDED_S3_PACK);
    const targets = subjects.filter((row) => subjectCodes.includes(row.code));
    if (targets.length !== subjectCodes.length) {
      notify('err', `Could not find all six configured subjects in this academic scope (found ${targets.length}).`);
      return;
    }
    setPublishingGeneratedPack(true);
    try {
      let inserted = 0;
      let archived = 0;
      for (const subject of targets) {
        const basePack = GENERATED_S3_PACK[subject.code];
        const expandedPack = EXPANDED_S3_PACK[subject.code];
        if (!basePack || !expandedPack) continue;
        const detail = await api.getSubjectDetail(subject.id, true);
        const moduleMap = new Map(detail.modules.map((module) => [module.module_number, module]));
        const expectedNumbers = basePack.map((entry) => entry.module_number);
        if (expectedNumbers.some((number) => !moduleMap.has(number))) {
          throw new Error(`${subject.code} is missing one or more configured modules.`);
        }

        // Hide the previous generated pack, retaining a reversible CMS archive.
        for (const row of detail.resources.filter((item) => item.title.startsWith('Generated Exam Notes — Module ') && item.source_category === 'simplified_ai_notes')) {
          await api.patchResource(row.id, { is_published: false }); archived++;
        }
        for (const row of detail.questions.filter((item) => item.source_label === 'Generated S3 Study Pack — syllabus/source synthesis')) {
          await api.patchQuestion(row.id, { is_published: false }); archived++;
        }
        for (const row of detail.programs.filter((item) => item.title.startsWith('Worked Example — Module '))) {
          await api.patchProgram(row.id, { is_published: false }); archived++;
        }
        const oldRevisionTitles = new Set(basePack.flatMap((item) => [item.revisionTitle, item.revision2Title]));
        for (const row of detail.revisionItems.filter((item) => oldRevisionTitles.has(item.title))) {
          await api.patchRevisionItem(row.id, { is_published: false }); archived++;
        }

        const topicIds = new Map<string, number>();
        const topicItems = expandedPack.flatMap((module, index) => [...new Set([module.topics[0], ...module.questions.map((question) => question.topic)])].map((title, topicIndex) => ({ module_number: index + 1, title, topicIndex })));
        for (const row of detail.topics) {
          const match = topicItems.find((item) => item.title === row.title && moduleMap.get(item.module_number)?.id === row.module_id);
          if (match) topicIds.set(`${match.module_number}:${match.title}`, row.id);
        }
        const missingTopics = topicItems.filter((item) => !topicIds.has(`${item.module_number}:${item.title}`));
        if (missingTopics.length) {
          const result = await api.bulkImport({ entityType: 'topics', subjectId: subject.id, items: missingTopics.map((item) => ({
            module_number: item.module_number, title: item.title, summary: `Question topic for ${subject.code} Module ${item.module_number}.`, importance: 'important', content_type: 'theory', sort_order: item.topicIndex + 1, is_published: true,
          })) });
          inserted += result.inserted;
          const refreshed = await api.getSubjectDetail(subject.id, true);
          for (const item of topicItems) {
            const row = refreshed.topics.find((topic) => topic.title === item.title && topic.module_id === moduleMap.get(item.module_number)?.id);
            if (row) topicIds.set(`${item.module_number}:${item.title}`, row.id);
          }
        }

        const notes = basePack.map((item, index) => {
          const extra = expandedPack[index];
          const diagrams: Record<string, Record<number, string>> = {
            PBCST304: { 1: 'jvm-architecture', 2: 'inheritance-dispatch', 3: 'exception-hierarchy', 4: 'jdbc-architecture' },
            PCCST302: { 1: 'dfa-substring', 3: 'pda-anbn', 4: 'turing-machine' },
            GAMAT301: { 4: 'markov-states' },
            PCCST303: { 3: 'bst' },
            GAEST305: { 3: 'full-adder', 4: 'fsm-flow' },
            UCHUT346: { 1: 'ppc' },
          };
          const priorities = `\n\n### Importance and source evidence\n- **Must Study:** ${extra.mustStudy.join('; ')}\n- **Important:** ${extra.important.join('; ')}\n- **Additional:** ${extra.additional.join('; ')}\n\n${extra.evidence}\n\n${extra.addendum}`;
          return {
            module_number: item.module_number, scheme_id: subject.scheme_id, semester_id: subject.semester_id, academic_year_id: subject.academic_year_id,
            title: `Exam-Friendly Notes — Module ${item.module_number}`,
            description: `Concise exam-oriented notes for ${subject.code} Module ${item.module_number}, with three evidence-based priority levels, worked examples and subject-specific formulas, syntax or diagrams.`,
            resource_type: 'exam_notes', source_category: 'simplified_ai_notes', importance: 'must_study', content_format: 'markdown', content_markdown: `${item.note}${priorities}`, diagram_key: diagrams[subject.code]?.[item.module_number], is_published: true,
          };
        });
        const questionItems = basePack.flatMap((item, index) => {
          const extra = expandedPack[index];
          const topicName = extra.topics[0];
          const baseQuestion = {
            module_number: item.module_number, topic_id: topicIds.get(`${item.module_number}:${topicName}`) ?? null,
            question_text: item.question, question_type: 'descriptive', marks: 5, difficulty: 'medium', importance: 'must_study',
            source_label: 'Original practice synthesis — supplied syllabus and KTU study sources', source_category: 'practice_material', exam_year: null,
            is_solved: true, is_important: true, is_published: true,
            short_answer: item.answer, detailed_explanation: item.answer, expected_marks: 5,
          };
          const authored = extra.questions.map((question) => ({
            module_number: item.module_number, topic_id: topicIds.get(`${item.module_number}:${question.topic}`) ?? topicIds.get(`${item.module_number}:${topicName}`) ?? null,
            question_text: question.question, question_type: question.type, marks: question.marks, difficulty: question.difficulty, importance: question.importance,
            source_label: question.source || `Syllabus-aligned practice — ${subject.code} Module ${item.module_number}; supplied KTU notes and Q bank/model paper`,
            source_category: 'practice_material', is_solved: question.solved, is_important: question.importance === 'must_study', is_published: true,
            short_answer: question.answer, detailed_explanation: question.detail || question.answer, formula_text: question.formula,
            code_snippet: question.code, code_language: question.language, diagram_key: question.diagramKey, expected_marks: question.marks,
          }));
          return [baseQuestion, ...authored];
        });
        const appliedExamples = basePack.map((item) => ({
          module_number: item.module_number, title: `Worked Example — Module ${item.module_number}: ${item.exampleTitle}`, description: item.problem,
          problem_statement: item.problem, language: subject.code === 'PBCST304' ? 'java' : subject.code === 'PCCST303' ? 'text' : 'text', code: item.workedExample, explanation: item.workedExample,
          importance: 'important', is_published: true,
        }));
        const cards = expandedPack.flatMap((module, index) => module.revisions.map((card, cardIndex) => ({
          module_number: index + 1, title: card.title, content_markdown: card.content, category: card.category, importance: card.importance,
          code_snippet: card.code, diagram_key: card.diagramKey, sort_order: cardIndex + 1, is_published: true,
        })));
        for (const [entityType, items] of [['resources', notes], ['questions', questionItems], ['programs', appliedExamples], ['revision_items', cards]] as const) {
          const result = await api.bulkImport({ entityType, subjectId: subject.id, items });
          inserted += result.inserted;
        }
      }
      await loadSubjectScopedData(selectedSubjectId);
      await loadSubjects();
      notify('ok', `Published 240 study entries across ${targets.length} subjects and archived ${archived} prior generated rows.`);
    } catch (err) {
      notify('err', `Study pack replacement stopped after a partial save: ${(err as Error).message}`);
      await loadSubjectScopedData(selectedSubjectId);
      await loadSubjects();
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
    { id: 'submissions', label: `Community Submissions${submissions.filter((s) => s.status === 'pending').length ? ` (${submissions.filter((s) => s.status === 'pending').length})` : ''}`, icon: Bell },
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
          <div className="relative">
            <Button variant="outline" size="sm" aria-label="Notifications" onClick={() => setNotificationOpen((open) => !open)}>
              <Bell className="h-4 w-4" />
              {notifications.filter((n) => !n.read_at).length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-[10px] leading-4 text-white">{notifications.filter((n) => !n.read_at).length}</span>}
            </Button>
            {notificationOpen && <div className="absolute right-0 z-50 mt-2 max-h-[28rem] w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2 border-b pb-2 dark:border-slate-800"><strong className="text-sm">Notifications</strong><button className="text-[11px] font-semibold text-indigo-600" onClick={async () => { await getSupabase().from('admin_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null); await loadNotifications(); }}>Mark all read</button></div>
              {notifications.length === 0 ? <p className="py-5 text-center text-xs text-slate-500">No notifications yet.</p> : notifications.map((n) => <button key={n.id} className={`block w-full rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${n.read_at ? 'opacity-70' : ''}`} onClick={async () => { if (!n.read_at) await getSupabase().from('admin_notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id); await loadNotifications(); setSelectedSubmissionId(n.submission_id); setResourceTypeFilter('all'); setTab('submissions'); setNotificationOpen(false); void loadSubmissions(); window.setTimeout(()=>document.getElementById(`submission-${n.submission_id}`)?.scrollIntoView({behavior:'smooth',block:'center'}),150); }}><span className="block text-xs font-bold">{n.title}</span><span className="mt-1 block text-[11px] leading-5 text-slate-600 dark:text-slate-300">{n.message}</span><span className="mt-1 block text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span></button>)}
            </div>}
          </div>
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

      {tab === 'submissions' && (
        <section className="mt-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Community Submissions</h2><p className="mt-1 text-xs text-slate-500">Review student contributions. Pending files remain private until you publish them.</p></div><div className="flex flex-wrap gap-2"><Input value={cmsSearch} onChange={(e) => setCmsSearch(e.target.value)} placeholder="Search submissions..." className="w-56"/><Select value={resourceTypeFilter} onChange={(e) => setResourceTypeFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Select><Select value={submissionBranchFilter} onChange={e=>setSubmissionBranchFilter(e.target.value)}><option value="all">All branches</option>{hierarchy?.branches.map(b=><option key={b.id} value={b.id}>{b.code}</option>)}</Select><Select value={submissionSemesterFilter} onChange={e=>setSubmissionSemesterFilter(e.target.value)}><option value="all">All semesters</option>{hierarchy?.semesters.map(s=><option key={s.id} value={s.id}>{s.code}</option>)}</Select><Select value={submissionCategoryFilter} onChange={e=>setSubmissionCategoryFilter(e.target.value)}><option value="all">All categories</option>{['Study Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources'].map(c=><option key={c}>{c}</option>)}</Select><Input type="date" aria-label="Submission date" value={submissionDateFilter} onChange={e=>setSubmissionDateFilter(e.target.value)} className="w-40"/></div></div>
          {submissions.filter((item) => (resourceTypeFilter === 'all' || item.status === resourceTypeFilter) && (submissionBranchFilter==='all'||String(item.branch_id)===submissionBranchFilter) && (submissionSemesterFilter==='all'||String(item.semester_id)===submissionSemesterFilter) && (submissionCategoryFilter==='all'||item.category===submissionCategoryFilter) && (!submissionDateFilter||item.created_at.slice(0,10)===submissionDateFilter) && `${item.title} ${item.branch?.code} ${item.subject_name} ${item.subject_code} ${item.category}`.toLowerCase().includes(cmsSearch.toLowerCase())).map((item) => {
            const targetSubjects = subjects.filter((subject) => subject.branch_id === item.branch_id && subject.semester_id === item.semester_id);
            return <Card id={`submission-${item.id}`} key={item.id} className={selectedSubmissionId===item.id?'ring-2 ring-indigo-500':''}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.title}</h3><Badge variant={item.status === 'approved' ? 'emerald' : item.status === 'pending' ? 'amber' : 'outline'}>{item.status === 'pending' ? 'Pending Review' : item.status}</Badge></div><p className="mt-1 text-xs text-slate-500">{item.branch?.code} · {item.semester?.code} · {item.subject?.code || item.subject_code || item.subject_name || 'Subject to verify'} · {item.category}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString()} · {item.original_file_name} · {(item.file_size_bytes/1048576).toFixed(2)} MB</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={async () => { try { const { data, error } = await getSupabase().storage.from('pending-submissions').createSignedUrl(item.file_path, 120); if (error) throw error; window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); } catch (err) { notify('err', (err as Error).message); } }}>Preview / Download</Button></div></div>
              {(item.contributor_name || item.contributor_email || item.description || item.source_info || item.internal_review_notes || item.rejection_reason) && <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950 sm:grid-cols-2"><div>{item.contributor_name && <p>Contributor: {item.contributor_name}</p>}{item.contributor_email && <p>Email: {item.contributor_email}</p>}{item.module_label && <p>Module: {item.module_label}</p>}{item.topic_label && <p>Topic: {item.topic_label}</p>}</div><div>{item.description && <p>{item.description}</p>}{item.source_info && <p className="mt-1">Source: {item.source_info}</p>}{item.internal_review_notes && <p className="mt-1">Internal notes: {item.internal_review_notes}</p>}{item.rejection_reason && <p className="mt-1">Rejection reason: {item.rejection_reason}</p>}</div></div>}
              {item.status === 'pending' && <div className="mt-3 flex items-end gap-2"><label className="flex-1 text-[11px] font-semibold text-slate-600">Internal review notes<textarea rows={2} value={submissionNotes[item.id] ?? item.internal_review_notes ?? ''} onChange={e=>setSubmissionNotes((state)=>({...state,[item.id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"/></label><Button size="sm" variant="outline" onClick={async()=>{const {error}=await getSupabase().from('community_submissions').update({internal_review_notes:submissionNotes[item.id]||null}).eq('id',item.id).eq('status','pending');if(error)notify('err',error.message);else{await loadSubmissions();notify('ok','Internal review notes saved.')}}}>Save notes</Button></div>}
              {item.status === 'pending' && <div className="mt-4 flex flex-wrap items-end gap-2"><label className="min-w-64 flex-1 text-[11px] font-semibold text-slate-600">Confirm academic subject<select value={submissionSubjects[item.id] || String(item.subject_id || '')} onChange={(e) => setSubmissionSubjects((state) => ({ ...state, [item.id]: e.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"><option value="">Choose verified subject…</option>{targetSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} — {subject.name}</option>)}</select></label><Button size="sm" disabled={!Number(submissionSubjects[item.id] || item.subject_id)} onClick={async () => { let copiedPath=''; try { const { data: file, error: downloadError } = await getSupabase().storage.from('pending-submissions').download(item.file_path); if (downloadError || !file) throw downloadError || new Error('Could not read pending file.'); copiedPath=`community/${item.id}/${item.original_file_name.replace(/[^a-zA-Z0-9._-]+/g,'-')}`; const { error: uploadError }=await getSupabase().storage.from('study-resources').upload(copiedPath,file,{contentType:item.mime_type,upsert:false}); if(uploadError)throw uploadError; const {error:approveError}=await getSupabase().rpc('approve_community_submission',{p_submission_id:item.id,p_subject_id:Number(submissionSubjects[item.id]||item.subject_id),p_module_id:null,p_published_file_path:copiedPath}); if(approveError)throw approveError; await loadSubmissions(); await loadNotifications(); notify('ok','Submission approved and added to published resources.'); } catch(err) { if(copiedPath) await getSupabase().storage.from('study-resources').remove([copiedPath]); notify('err',(err as Error).message); } }}> <Check className="h-3.5 w-3.5"/>Approve &amp; Publish</Button><Button size="sm" variant="outline" onClick={async()=>{const reason=window.prompt('Optional rejection reason:')||null;const {error}=await getSupabase().from('community_submissions').update({status:'rejected',reviewed_by:(await api.currentUser())?.id,reviewed_at:new Date().toISOString(),rejection_reason:reason}).eq('id',item.id).eq('status','pending');if(error)notify('err',error.message);else{await loadSubmissions();notify('ok','Submission rejected and kept private.')}}}>Reject</Button><Button size="sm" variant="danger" onClick={async()=>{if(!window.confirm('Delete this submission and its pending file?'))return;const {error}=await getSupabase().from('community_submissions').delete().eq('id',item.id);if(error){notify('err',error.message);return}await getSupabase().storage.from('pending-submissions').remove([item.file_path]);await loadSubmissions();await loadNotifications();}}>Delete</Button></div>}
            </CardContent></Card>;
          })}
          {submissions.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-slate-500">No community submissions yet.</CardContent></Card>}
        </section>
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
                          try {
                            await api.updateSubject(s.id, { is_published: !s.is_published });
                            await loadSubjects();
                          } catch (err) {
                            notify('err', (err as Error).message);
                          }
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
                          try {
                            await api.deleteSubject(s.id);
                            await loadSubjects();
                            notify('ok', `Deleted ${s.code}`);
                          } catch (err) {
                            notify('err', (err as Error).message);
                          }
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
                        try {
                          await api.deleteModule(m.id);
                          await loadSubjectScopedData(selectedSubjectId);
                        } catch (err) {
                          notify('err', (err as Error).message);
                        }
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
                          try {
                            await api.deleteTopic(t.id);
                            await loadSubjectScopedData(selectedSubjectId);
                          } catch (err) {
                            notify('err', (err as Error).message);
                          }
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
                        await api.createResource({ subject_id: selectedSubjectId, module_id: uploadModuleId ? Number(uploadModuleId) : null, scheme_id: activeSubject?.scheme_id ?? null, semester_id: activeSubject?.semester_id ?? null, academic_year_id: activeSubject?.academic_year_id ?? null, title: uploadOverrides[uploadKey(file)]?.title.trim() || (uploadQueue.length === 1 && uploadTitle.trim() ? uploadTitle.trim() : file.name.replace(/\.[^.]+$/, '')), description: uploadDescription, resource_type: categoryType[category], category, source_category: 'practice_material', importance: 'important', content_format: 'pdf', file_url: null, file_path: uploaded.file_path, file_name: uploaded.file_name, file_size_bytes: uploaded.file_size_bytes, mime_type: uploaded.mime_type, is_published: uploadPublished });
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
                      scheme_id: activeSubject?.scheme_id ?? null,
                      semester_id: activeSubject?.semester_id ?? null,
                      academic_year_id: activeSubject?.academic_year_id ?? null,
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
                {subjectSyllabus && <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={async () => { const title = window.prompt('Syllabus title', subjectSyllabus.title); if (title === null) return; const description = window.prompt('Syllabus description', ''); try { await api.updateSyllabusMetadata(selectedSubjectId, { title, description: description || '' }); await loadSubjectScopedData(selectedSubjectId); } catch (err) { notify('err', (err as Error).message); } }}>Edit details</Button><Button size="sm" variant="outline" onClick={async () => { try { await api.setSyllabusPublished(selectedSubjectId, !subjectSyllabus.is_published); await loadSubjectScopedData(selectedSubjectId); } catch (err) { notify('err', (err as Error).message); } }}> {subjectSyllabus.is_published ? 'Unpublish' : 'Publish'} </Button><Button size="sm" variant="ghost" onClick={async () => { if (!window.confirm('Delete the official syllabus PDF?')) return; try { await api.deleteSyllabus(selectedSubjectId); await loadSubjectScopedData(selectedSubjectId); notify('ok', 'Syllabus deleted.'); } catch (err) { notify('err', (err as Error).message); } }}><Trash2 className="h-4 w-4 text-rose-500"/>Delete</Button></div>}
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
                            try {
                              await api.patchResource(r.id, { title: title.trim(), description: description ?? r.description, category: category || r.category, resource_type: categoryType[category || ''] || r.resource_type });
                              await loadSubjectScopedData(selectedSubjectId);
                            } catch (err) {
                              notify('err', (err as Error).message);
                            }
                          }}
                        >Edit</Button>
                        {r.file_path && <label className="inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs font-medium"><FileUp className="mr-1 h-3.5 w-3.5"/>Replace<input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { await api.replaceResourceFile(r.id, file); await loadSubjectScopedData(selectedSubjectId); notify('ok', 'Resource file replaced.'); } catch (error) { notify('err', (error as Error).message); } finally { e.target.value = ''; } }} /></label>}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await api.patchResource(r.id, { is_published: !r.is_published });
                              await loadSubjectScopedData(selectedSubjectId);
                            } catch (err) {
                              notify('err', (err as Error).message);
                            }
                          }}
                        >
                          {r.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await api.deleteResource(r.id);
                              await loadSubjectScopedData(selectedSubjectId);
                              await loadSubjects();
                            } catch (err) {
                              notify('err', (err as Error).message);
                            }
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
                          try {
                            await api.deleteQuestion(q.id);
                            await loadSubjectScopedData(selectedSubjectId);
                            await loadSubjects();
                          } catch (err) {
                            notify('err', (err as Error).message);
                          }
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
                        try {
                          await api.deleteProgram(p.id);
                          await loadSubjectScopedData(selectedSubjectId);
                        } catch (err) {
                          notify('err', (err as Error).message);
                        }
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
                        try {
                          await api.deleteRevisionItem(ri.id);
                          await loadSubjectScopedData(selectedSubjectId);
                        } catch (err) {
                          notify('err', (err as Error).message);
                        }
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
                <h3 className="text-sm font-semibold">Replace the generated S3 study library</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Replaces the previous generated pack across all six supplied subjects with 240 exam-friendly entries: 24 module notes, 120 answered questions (including solved questions), 24 worked examples and 72 revision cards. The previous generated rows are unpublished and remain recoverable in CMS.
                </p>
                <Button className="mt-3" disabled={publishingGeneratedPack} onClick={publishGeneratedPack}>
                  <Zap className="h-4 w-4" />
                  {publishingGeneratedPack ? 'Replacing six-subject library…' : 'Replace generated pack for all six subjects'}
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
