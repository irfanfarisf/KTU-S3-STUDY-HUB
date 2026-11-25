import type {
  AdminUser,
  HierarchyData,
  ModuleItem,
  ProgramItem,
  Question,
  Resource,
  RevisionItem,
  SearchResultItem,
  Subject,
  SubjectSyllabus,
  Topic,
} from '@shared/types';
import { getSupabase, supabase } from '@/lib/supabase';

type Row = Record<string, any>;

async function result<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as T;
}

function mapSubject(row: Row, includeUnpublished = false): Subject {
  const countPublished = (items?: Array<{ id: number; is_published?: boolean; deleted_at?: string | null }>) =>
    items
      ? items.filter((item) => !item.deleted_at && (includeUnpublished || item.is_published !== false)).length
      : undefined;
  return {
    ...row,
    branch_code: row.branch?.code,
    branch_name: row.branch?.name,
    semester_code: row.semester?.code,
    semester_label: row.semester?.label,
    scheme_name: row.scheme?.name,
    university_code: row.university?.code,
    module_count: countPublished(row.modules),
    resource_count: countPublished(row.resources),
    question_count: countPublished(row.questions),
    program_count: countPublished(row.programs),
    topic_count: countPublished(row.topics),
  } as Subject;
}

function mapResource(row: Row): Resource {
  return {
    ...row,
    branch_id: row.subject?.branch_id ?? null,
    subject_code: row.subject?.code,
    subject_name: row.subject?.name,
    module_number: row.module?.module_number ?? null,
    module_title: row.module?.title ?? null,
    topic_title: row.topic?.title ?? null,
    scheme_name: row.scheme?.name,
    semester_code: row.semester?.code,
    academic_year_label: row.academic_year?.label,
  } as Resource;
}

function mapQuestion(row: Row): Question {
  return {
    ...row,
    answer: Array.isArray(row.answers) ? row.answers[0] ?? null : row.answers ?? null,
    subject_code: row.subject?.code,
    subject_name: row.subject?.name,
    module_number: row.module?.module_number ?? null,
    module_title: row.module?.title ?? null,
    topic_title: row.topic?.title ?? null,
  } as Question;
}

function mapProgram(row: Row): ProgramItem {
  return {
    ...row,
    subject_code: row.subject?.code,
    subject_name: row.subject?.name,
    module_number: row.module?.module_number ?? null,
    module_title: row.module?.title ?? null,
  } as ProgramItem;
}

function mapRevision(row: Row): RevisionItem {
  return {
    ...row,
    subject_code: row.subject?.code,
    subject_name: row.subject?.name,
    module_number: row.module?.module_number ?? null,
    module_title: row.module?.title ?? null,
  } as RevisionItem;
}

function filterBy<T extends Row>(query: any, filters: Record<string, unknown>): any {
  let next = query;
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') next = next.eq(key, value);
  }
  return next;
}

function metadataSubjectSelect(): string {
  return '*, university:universities(code), scheme:schemes(name), branch:branches(code,name), semester:semesters(code,label), modules(id,is_published), resources(id,is_published,deleted_at), questions(id,is_published), programs(id,is_published), topics(id,is_published)';
}

async function adminUserFor(userId: string): Promise<AdminUser | null> {
  const row = await result<Row | null>(
    getSupabase().from('admins').select('id,email,name,role').eq('id', userId).maybeSingle()
  );
  return row ? ({ ...row } as AdminUser) : null;
}

export interface SubjectDetailResponse {
  subject: Subject;
  modules: ModuleItem[];
  topics: Topic[];
  resources: Resource[];
  questions: Question[];
  programs: ProgramItem[];
  revisionItems: RevisionItem[];
  syllabus: SubjectSyllabus | null;
}

export interface ModuleDetailResponse extends SubjectDetailResponse {
  module: ModuleItem;
  allModules: Array<{ id: number; module_number: number; title: string }>;
  subjectLevelPapers: Resource[];
}

export interface StudentRecord {
  user_id: string;
  record_key: string;
  record_type: 'bookmark' | 'topic_complete' | 'question_practiced';
  payload: Record<string, unknown>;
}

export const api = {
  getHierarchy: async (): Promise<HierarchyData> => {
    const db = getSupabase();
    const [universities, schemes, academicYears, branches, semesters] = await Promise.all([
      result(db.from('universities').select('*').order('id')),
      result(db.from('schemes').select('*').order('year', { ascending: false }).order('id')),
      result(db.from('academic_years').select('*').order('start_year', { ascending: false })),
      result(db.from('branches').select('*').order('id')),
      result(db.from('semesters').select('*').order('number')),
    ]);
    return { universities, schemes, academicYears, branches, semesters } as HierarchyData;
  },

  getSubjects: async (filters?: {
    universityId?: number; schemeId?: number; branchId?: number; semesterId?: number; includeUnpublished?: boolean;
  }): Promise<Subject[]> => {
    let query = getSupabase().from('subjects').select(metadataSubjectSelect())
      .order('sort_order').order('code');
    if (!filters?.includeUnpublished) query = query.eq('is_published', true);
    query = filterBy(query, {
      university_id: filters?.universityId,
      scheme_id: filters?.schemeId,
      branch_id: filters?.branchId,
      semester_id: filters?.semesterId,
    });
    const rows = await result<Row[]>(query);
    return rows.map((row) => mapSubject(row, Boolean(filters?.includeUnpublished)));
  },

  getSubjectDetail: async (codeOrId: string | number, includeUnpublished = false): Promise<SubjectDetailResponse> => {
    const db = getSupabase();
    let subjectQuery = db.from('subjects').select('*, university:universities(code,name), scheme:schemes(name), branch:branches(code,name), semester:semesters(code,label)');
    subjectQuery = typeof codeOrId === 'number' || /^\d+$/.test(String(codeOrId))
      ? subjectQuery.eq('id', Number(codeOrId))
      : subjectQuery.ilike('code', String(codeOrId));
    if (!includeUnpublished) subjectQuery = subjectQuery.eq('is_published', true);
    const subjectRow = await result<Row | null>(subjectQuery.maybeSingle());
    if (!subjectRow) throw new Error('Subject not found.');
    const subject = mapSubject(subjectRow);
    const subjectId = subjectRow.id;
    let modulesQuery = db.from('modules').select('*').eq('subject_id', subjectId).order('module_number');
    let topicsQuery = db.from('topics').select('*').eq('subject_id', subjectId).order('sort_order').order('id');
    let resourcesQuery = db.from('resources').select('*, subject:subjects(code,name), module:modules(module_number,title), topic:topics(title), scheme:schemes(name), semester:semesters(code), academic_year:academic_years(label)').eq('subject_id', subjectId).order('created_at', { ascending: false });
    let questionsQuery = db.from('questions').select('*, subject:subjects(code,name), module:modules(module_number,title), topic:topics(title), answers(*)').eq('subject_id', subjectId).order('id');
    let programsQuery = db.from('programs').select('*, subject:subjects(code,name), module:modules(module_number,title)').eq('subject_id', subjectId).order('id');
    let revisionQuery = db.from('revision_items').select('*, subject:subjects(code,name), module:modules(module_number,title)').eq('subject_id', subjectId).order('sort_order').order('id');
    let syllabusQuery = db.from('subject_syllabi').select('*').eq('subject_id', subjectId);
    if (!includeUnpublished) {
      modulesQuery = modulesQuery.eq('is_published', true);
      topicsQuery = topicsQuery.eq('is_published', true);
      resourcesQuery = resourcesQuery.eq('is_published', true).is('deleted_at', null);
      questionsQuery = questionsQuery.eq('is_published', true);
      programsQuery = programsQuery.eq('is_published', true);
      revisionQuery = revisionQuery.eq('is_published', true);
      syllabusQuery = syllabusQuery.eq('is_published', true);
    }
    const [modules, topics, resources, questions, programs, revisionItems, syllabus] = await Promise.all([
      result<Row[]>(modulesQuery),
      result<Row[]>(topicsQuery),
      result<Row[]>(resourcesQuery),
      result<Row[]>(questionsQuery),
      result<Row[]>(programsQuery),
      result<Row[]>(revisionQuery),
      result<Row | null>(syllabusQuery.maybeSingle()),
    ]);
    return {
      subject,
      modules: modules.map((module) => ({
        ...module,
        resource_count: resources.filter((resource) => resource.module_id === module.id && resource.is_published && !resource.deleted_at).length,
        question_count: questions.filter((question) => question.module_id === module.id && question.is_published).length,
        program_count: programs.filter((program) => program.module_id === module.id && program.is_published).length,
        topic_count: topics.filter((topic) => topic.module_id === module.id && topic.is_published).length,
      } as unknown as ModuleItem)),
      topics: topics as Topic[],
      resources: resources.map(mapResource),
      questions: questions.map(mapQuestion),
      programs: programs.map(mapProgram),
      revisionItems: revisionItems.map(mapRevision),
      syllabus: syllabus as SubjectSyllabus | null,
    };
  },

  getModuleDetail: async (codeOrId: string | number, moduleNumber: number): Promise<ModuleDetailResponse> => {
    const detail = await api.getSubjectDetail(codeOrId);
    const module = detail.modules.find((row) => row.module_number === moduleNumber);
    if (!module) throw new Error('Module not found.');
    return {
      ...detail,
      module,
      allModules: detail.modules.map(({ id, module_number, title }) => ({ id, module_number, title })),
      topics: detail.topics.filter((row) => row.module_id === module.id),
      resources: detail.resources.filter((row) => row.module_id === module.id),
      subjectLevelPapers: detail.resources.filter((row) => row.module_id === null && ['pyq', 'model_paper', 'solved_paper'].includes(row.resource_type)),
      questions: detail.questions.filter((row) => row.module_id === module.id),
      programs: detail.programs.filter((row) => row.module_id === module.id),
      revisionItems: detail.revisionItems.filter((row) => row.module_id === module.id),
    };
  },

  getResources: async (filters?: {
    subjectId?: number; moduleId?: number; resourceType?: string; examType?: string; importance?: string;
    schemeId?: number; branchId?: number; semesterId?: number; category?: string;
    includeUnpublished?: boolean; includeDeleted?: boolean; deletedOnly?: boolean;
  }): Promise<Resource[]> => {
    let query = getSupabase()
      .from('resources')
      .select('*, subject:subjects!inner(code,name,scheme_id,branch_id,semester_id,is_published), module:modules(module_number,title), topic:topics(title), scheme:schemes(name), semester:semesters(code), academic_year:academic_years(label)')
      .order('created_at', { ascending: false });
    query = filterBy(query, {
      subject_id: filters?.subjectId,
      module_id: filters?.moduleId,
      exam_type: filters?.examType,
      importance: filters?.importance,
      category: filters?.category,
    });
    if (!filters?.includeUnpublished) {
      query = query.eq('is_published', true).is('deleted_at', null).eq('subject.is_published', true);
    } else if (filters?.deletedOnly) {
      query = query.not('deleted_at', 'is', null);
    } else if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }
    if (filters?.schemeId) query = query.eq('subject.scheme_id', filters.schemeId);
    if (filters?.branchId) query = query.eq('subject.branch_id', filters.branchId);
    if (filters?.semesterId) query = query.eq('subject.semester_id', filters.semesterId);
    if (filters?.resourceType) {
      const types = filters.resourceType.split(',').map((value) => value.trim()).filter(Boolean);
      if (types.length > 1) query = query.in('resource_type', types);
      else if (types.length === 1) query = query.eq('resource_type', types[0]);
    }
    return (await result<Row[]>(query)).map(mapResource);
  },

  getSyllabi: async (filters?: { subjectId?: number; schemeId?: number; branchId?: number; semesterId?: number }): Promise<Resource[]> => {
    let query = getSupabase()
      .from('subject_syllabi')
      .select('*, subject:subjects!inner(id,code,name,scheme_id,branch_id,semester_id,academic_year_id,is_published)')
      .eq('is_published', true)
      .eq('subject.is_published', true)
      .order('subject_id');
    if (filters?.subjectId) query = query.eq('subject_id', filters.subjectId);
    if (filters?.schemeId) query = query.eq('subject.scheme_id', filters.schemeId);
    if (filters?.branchId) query = query.eq('subject.branch_id', filters.branchId);
    if (filters?.semesterId) query = query.eq('subject.semester_id', filters.semesterId);
    const rows = await result<Row[]>(query);
    return rows.map((row) => ({
      id: -Number(row.id),
      subject_id: row.subject_id,
      module_id: null,
      topic_id: null,
      academic_year_id: row.subject?.academic_year_id ?? null,
      scheme_id: row.subject?.scheme_id ?? null,
      semester_id: row.subject?.semester_id ?? null,
      title: row.title,
      description: row.description,
      resource_type: 'syllabus',
      source_category: 'official_document',
      importance: 'important',
      content_format: 'pdf',
      exam_type: null,
      exam_year: null,
      content_markdown: null,
      diagram_key: null,
      file_url: null,
      file_path: row.file_path,
      file_name: row.file_name,
      file_size_bytes: row.file_size_bytes,
      mime_type: row.mime_type,
      category: 'Official Syllabus',
      is_published: row.is_published,
      created_at: row.created_at,
      updated_at: row.updated_at,
      subject_code: row.subject?.code,
      subject_name: row.subject?.name,
      module_number: null,
      module_title: null,
      topic_title: null,
    } as Resource));
  },

  getQuestions: async (filters?: {
    subjectId?: number; moduleId?: number; questionType?: string; importance?: string; difficulty?: string;
    schemeId?: number; branchId?: number; semesterId?: number;
    solvedOnly?: boolean; importantOnly?: boolean; includeUnpublished?: boolean;
  }): Promise<Question[]> => {
    let query = getSupabase()
      .from('questions')
      .select('*, subject:subjects!inner(code,name,scheme_id,branch_id,semester_id,is_published), module:modules(module_number,title), topic:topics(title), answers(*)')
      .order('id');
    query = filterBy(query, { subject_id: filters?.subjectId, module_id: filters?.moduleId, question_type: filters?.questionType, importance: filters?.importance, difficulty: filters?.difficulty });
    if (!filters?.includeUnpublished) query = query.eq('is_published', true).eq('subject.is_published', true);
    if (filters?.schemeId) query = query.eq('subject.scheme_id', filters.schemeId);
    if (filters?.branchId) query = query.eq('subject.branch_id', filters.branchId);
    if (filters?.semesterId) query = query.eq('subject.semester_id', filters.semesterId);
    if (filters?.solvedOnly) query = query.eq('is_solved', true);
    if (filters?.importantOnly) query = query.eq('is_important', true);
    return (await result<Row[]>(query)).map(mapQuestion);
  },

  getPrograms: async (filters?: { subjectId?: number; moduleId?: number; includeUnpublished?: boolean }): Promise<ProgramItem[]> => {
    let query = getSupabase().from('programs').select('*, subject:subjects!inner(code,name,is_published), module:modules(module_number,title)').order('id');
    query = filterBy(query, { subject_id: filters?.subjectId, module_id: filters?.moduleId });
    if (!filters?.includeUnpublished) query = query.eq('is_published', true).eq('subject.is_published', true);
    return (await result<Row[]>(query)).map(mapProgram);
  },

  getRevisionItems: async (filters?: {
    subjectId?: number; moduleId?: number; category?: string;
    schemeId?: number; branchId?: number; semesterId?: number; includeUnpublished?: boolean;
  }): Promise<RevisionItem[]> => {
    let query = getSupabase()
      .from('revision_items')
      .select('*, subject:subjects!inner(code,name,scheme_id,branch_id,semester_id,is_published), module:modules(module_number,title)')
      .order('sort_order')
      .order('id');
    query = filterBy(query, { subject_id: filters?.subjectId, module_id: filters?.moduleId, category: filters?.category });
    if (!filters?.includeUnpublished) query = query.eq('is_published', true).eq('subject.is_published', true);
    if (filters?.schemeId) query = query.eq('subject.scheme_id', filters.schemeId);
    if (filters?.branchId) query = query.eq('subject.branch_id', filters.branchId);
    if (filters?.semesterId) query = query.eq('subject.semester_id', filters.semesterId);
    return (await result<Row[]>(query)).map(mapRevision);
  },

  search: async (params: { q?: string; subjectId?: number; moduleNumber?: number; resourceType?: string; importance?: string; examYear?: string }): Promise<SearchResultItem[]> => {
    const db = getSupabase();
    const [subjects, modules, topics, resources, questions, programs, revisions] = await Promise.all([
      result<Row[]>(db.from('subjects').select('*,branch:branches(code,name),semester:semesters(code,label)').eq('is_published', true).limit(500)),
      result<Row[]>(db.from('modules').select('*,subject:subjects!inner(id,code,name,is_published)').eq('is_published', true).eq('subject.is_published', true).limit(1000)),
      result<Row[]>(db.from('topics').select('*,subject:subjects!inner(id,code,name,is_published),module:modules(module_number,title)').eq('is_published', true).eq('subject.is_published', true).limit(1000)),
      result<Row[]>(db.from('resources').select('*,subject:subjects!inner(id,code,name,is_published),module:modules(module_number,title),topic:topics(title)').eq('is_published', true).is('deleted_at', null).eq('subject.is_published', true).limit(1000)),
      result<Row[]>(db.from('questions').select('*,subject:subjects!inner(id,code,name,is_published),module:modules(module_number,title),topic:topics(title),answers(short_answer)').eq('is_published', true).eq('subject.is_published', true).limit(1000)),
      result<Row[]>(db.from('programs').select('*,subject:subjects!inner(id,code,name,is_published),module:modules(module_number,title)').eq('is_published', true).eq('subject.is_published', true).limit(1000)),
      result<Row[]>(db.from('revision_items').select('*,subject:subjects!inner(id,code,name,is_published),module:modules(module_number,title)').eq('is_published', true).eq('subject.is_published', true).limit(1000)),
    ]);
    const term = params.q?.trim().toLocaleLowerCase();
    const matches = (text: unknown) => !term || String(text ?? '').toLocaleLowerCase().includes(term);
    const moduleMatch = (row: Row) => !params.moduleNumber || (row.module?.module_number ?? row.module_number) === params.moduleNumber;
    const out: SearchResultItem[] = [];
    const add = (kind: SearchResultItem['kind'], row: Row, title: string, snippet: string, url: string, resourceType?: string, importance?: string, examYear?: string | null) => {
      const subject = kind === 'subject' ? row : row.subject ?? {};
      const subjectId = kind === 'subject' ? row.id : row.subject_id;
      if ((params.subjectId && subjectId !== params.subjectId) || !moduleMatch(row) || (params.resourceType && resourceType !== params.resourceType) || (params.importance && importance !== params.importance) || (params.examYear && examYear !== params.examYear) || !matches(`${title} ${snippet} ${subject.code ?? ''} ${subject.name ?? ''}`)) return;
      out.push({ kind, id: row.id, title, snippet: snippet.slice(0, 240), subject_id: subjectId, subject_code: subject.code ?? '', subject_name: subject.name ?? '', module_number: row.module?.module_number ?? row.module_number ?? null, module_title: row.module?.title ?? (kind === 'module' ? row.title : null), url, resource_type: resourceType, importance: importance as SearchResultItem['importance'], exam_year: examYear } as SearchResultItem);
    };
    subjects.forEach((r) => add('subject', r, r.name, r.short_description || r.syllabus_summary || '', `/subjects/${r.code}`));
    modules.forEach((r) => add('module', r, `Module ${r.module_number}: ${r.title}`, r.description || r.syllabus_text || '', `/subjects/${r.subject?.code}/module/${r.module_number}`));
    topics.forEach((r) => add('topic', r, r.title, r.summary || '', r.module?.module_number ? `/subjects/${r.subject?.code}/module/${r.module.module_number}` : `/subjects/${r.subject?.code}`));
    if (!['question', 'program', 'revision'].includes(params.resourceType || '')) {
      resources.forEach((r) => add(
        'resource',
        r,
        r.title,
        r.description || r.content_markdown || '',
        r.category === 'Question Banks'
          ? `/question-bank?subject=${r.subject?.code ?? r.subject?.id}`
          : r.resource_type === 'pyq' || r.resource_type === 'model_paper' || r.resource_type === 'solved_paper'
            ? `/pyqs?subject=${r.subject?.id}`
            : `/notes?subject=${r.subject?.id}`,
        r.resource_type,
        r.importance,
        r.exam_year
      ));
    }
    if (!params.resourceType || params.resourceType === 'question') {
      questions.forEach((r) => add('question', r, r.question_text, r.answers?.[0]?.short_answer || `Question type: ${r.question_type}`, r.module?.module_number ? `/subjects/${r.subject?.code}/module/${r.module.module_number}#questions` : `/question-bank?subject=${r.subject?.code}`, 'question', r.importance, r.exam_year));
    }
    if (!params.resourceType || params.resourceType === 'program') {
      programs.forEach((r) => add('program', r, r.title, r.description || '', r.module?.module_number ? `/subjects/${r.subject?.code}/module/${r.module.module_number}#programs` : `/subjects/${r.subject?.code}`, 'program', r.importance));
    }
    if ((!params.resourceType || params.resourceType === 'revision') && !params.examYear) {
      revisions.forEach((r) => add('revision', r, r.title, String(r.content_markdown || '').slice(0, 140), `/quick-revision?subject=${r.subject?.code}`, 'revision', r.importance));
    }
    return out.slice(0, 100);
  },

  studentSignUp: async (email: string, password: string) => {
    const { data, error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },
  studentSignIn: async (email: string, password: string) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },
  sendPasswordReset: async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account?recovery=1` });
    if (error) throw new Error(error.message);
  },
  updatePassword: async (password: string) => {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },
  signOut: async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw new Error(error.message);
  },
  currentUser: async () => {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error && error.message !== 'Auth session missing!') throw new Error(error.message);
    return data.user;
  },
  getStudentRecords: async (userId: string): Promise<StudentRecord[]> => result(
    getSupabase().from('student_records').select('*').eq('user_id', userId).order('created_at')
  ),
  saveStudentRecord: async (record: Omit<StudentRecord, 'user_id'>): Promise<void> => {
    const user = await api.currentUser();
    if (!user) return;
    await result(getSupabase().from('student_records').upsert({ ...record, user_id: user.id }, { onConflict: 'user_id,record_key' }));
  },
  deleteStudentRecord: async (recordKey: string): Promise<void> => {
    const user = await api.currentUser();
    if (!user) return;
    await result(getSupabase().from('student_records').delete().eq('user_id', user.id).eq('record_key', recordKey));
  },
  clearStudentRecords: async (): Promise<void> => {
    const user = await api.currentUser();
    if (!user) return;
    await result(getSupabase().from('student_records').delete().eq('user_id', user.id));
  },

  adminLogin: async (email: string, password: string): Promise<{ token: string; user: AdminUser }> => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const user = await adminUserFor(data.user.id);
    if (!user) {
      await getSupabase().auth.signOut();
      throw new Error('This account does not have admin access.');
    }
    return { token: data.session.access_token, user };
  },
  adminMe: async (): Promise<{ user: AdminUser }> => {
    const user = await api.currentUser();
    if (!user) throw new Error('Sign in required.');
    const admin = await adminUserFor(user.id);
    if (!admin) throw new Error('Admin access required.');
    return { user: admin };
  },
  uploadFile: async (file: File) => {
    const extMimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      txt: 'text/plain',
      md: 'text/markdown',
    };
    const allowed = new Set(Object.values(extMimeMap));
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const resolvedMime = file.type || extMimeMap[ext] || '';
    if (!extMimeMap[ext] || !allowed.has(resolvedMime)) {
      throw new Error('Choose a PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP, or supported text file.');
    }
    if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('File size must be between 1 byte and 25 MB.');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-100);
    const path = `${crypto.randomUUID()}-${safeName}`;
    const storage = getSupabase().storage.from('study-resources');
    const { error } = await storage.upload(path, file, { contentType: resolvedMime, upsert: false });
    if (error) throw new Error(error.message);
    return { file_url: '', file_path: path, file_name: file.name, stored_name: path, file_size_bytes: file.size, mime_type: resolvedMime };
  },
  resourceFileUrl: async (resource: Resource, download = false): Promise<string | null> => {
    if (resource.file_path) {
      const { data, error } = await getSupabase().storage.from('study-resources').createSignedUrl(resource.file_path, 300, { download: download ? resource.file_name || true : undefined });
      if (error) throw new Error(error.message);
      return data.signedUrl;
    }
    if (!resource.file_url) return null;
    return download ? `${resource.file_url}${resource.file_url.includes('?') ? '&' : '?'}download=1` : resource.file_url;
  },

  createBranch: async (payload: { name: string; code: string; short_name?: string; description?: string }) => ({ id: await insertId('branches', { ...payload, code: payload.code.toUpperCase(), short_name: payload.short_name || payload.code.toUpperCase() }) }),
  createSemester: async (payload: { number: number; label: string; code: string }) => ({ id: await insertId('semesters', { ...payload, code: payload.code.toUpperCase() }) }),
  createSubject: async (payload: Record<string, unknown>) => ({ id: await insertId('subjects', { ...payload, code: String(payload.code ?? '').trim().toUpperCase() }) }),
  updateSubject: async (id: number, payload: Record<string, unknown>) => { await result(getSupabase().from('subjects').update(payload).eq('id', id)); return { ok: true }; },
  deleteSubject: async (id: number) => deleteRow('subjects', id),
  createModule: async (payload: Record<string, unknown>) => ({ id: await insertId('modules', { ...payload, syllabus_text: payload.syllabus_text || payload.description || '', estimated_hours: payload.estimated_hours ?? 10 }) }),
  deleteModule: async (id: number) => deleteRow('modules', id),
  createTopic: async (payload: Record<string, unknown>) => {
    const title = String(payload.title ?? '').trim();
    const slug = payload.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { id: await insertId('topics', { ...payload, title, slug }) };
  },
  deleteTopic: async (id: number) => deleteRow('topics', id),
  createResource: async (payload: Record<string, unknown>) => ({ id: await insertId('resources', { ...payload, content_format: payload.content_format || (payload.file_url || payload.file_path ? 'pdf' : 'markdown') }) }),
  patchResource: async (id: number, payload: Record<string, unknown>) => { await result(getSupabase().from('resources').update(payload).eq('id', id)); return { ok: true }; },
  unpublishResource: async (id: number) => {
    const { error } = await getSupabase().rpc('unpublish_resource', { p_resource_id: id });
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  republishResource: async (
    id: number,
    destination?: { subjectId?: number | null; moduleId?: number | null; topicId?: number | null; category?: string | null }
  ) => {
    const { data, error } = await getSupabase().rpc('republish_resource', {
      p_resource_id: id,
      p_subject_id: destination?.subjectId ?? null,
      p_module_id: destination?.moduleId ?? null,
      p_topic_id: destination?.topicId ?? null,
      p_category: destination?.category ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: Number(data) };
  },
  softDeleteResource: async (id: number) => {
    const { error } = await getSupabase().rpc('soft_delete_resource', { p_resource_id: id });
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  restoreDeletedResource: async (
    id: number,
    destination?: { subjectId?: number | null; moduleId?: number | null; topicId?: number | null }
  ) => {
    const { data, error } = await getSupabase().rpc('restore_deleted_resource', {
      p_resource_id: id,
      p_subject_id: destination?.subjectId ?? null,
      p_module_id: destination?.moduleId ?? null,
      p_topic_id: destination?.topicId ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: Number(data) };
  },
  permanentlyDeleteResource: async (id: number) => {
    const { data, error } = await getSupabase().rpc('permanently_delete_resource', { p_resource_id: id });
    if (error) throw new Error(error.message);
    const res = data as { deleted_id: number; file_path: string | null; can_delete_storage_file: boolean };
    if (res?.can_delete_storage_file && res.file_path) {
      const { error: storageErr } = await getSupabase().storage.from('study-resources').remove([res.file_path]);
      if (storageErr) throw new Error(storageErr.message);
    }
    return res;
  },
  deleteResource: async (id: number) => {
    const { error } = await getSupabase().rpc('soft_delete_resource', { p_resource_id: id });
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  removeSubmissionFromCommunity: async (submissionId: string) => {
    const { error } = await getSupabase().rpc('remove_submission_from_community', { p_submission_id: submissionId });
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  restoreSubmissionToCommunity: async (submissionId: string) => {
    const { error } = await getSupabase().rpc('restore_submission_to_community', { p_submission_id: submissionId });
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  replaceResourceFile: async (id: number, file: File) => {
    const current = await result<Row | null>(getSupabase().from('resources').select('file_path').eq('id', id).maybeSingle());
    const next = await api.uploadFile(file);
    await result(getSupabase().from('resources').update({ file_path: next.file_path, file_url: null, file_name: next.file_name, file_size_bytes: next.file_size_bytes, mime_type: next.mime_type, content_format: next.mime_type === 'application/pdf' ? 'pdf' : 'mixed' }).eq('id', id));
    if (current?.file_path) await getSupabase().storage.from('study-resources').remove([current.file_path]);
  },
  saveSyllabus: async (subjectId: number, file: File, metadata: { title?: string; description?: string; is_published: boolean }) => {
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Official syllabi must be PDF files.');
    if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('Syllabus PDF must be smaller than 25 MB.');
    const old = await result<Row | null>(getSupabase().from('subject_syllabi').select('file_path').eq('subject_id', subjectId).maybeSingle());
    const upload = await api.uploadFile(file);
    await result(getSupabase().from('subject_syllabi').upsert({ subject_id: subjectId, title: metadata.title || 'Official Syllabus', description: metadata.description || '', file_path: upload.file_path, file_name: file.name, file_size_bytes: file.size, mime_type: file.type, is_published: metadata.is_published, updated_at: new Date().toISOString() }, { onConflict: 'subject_id' }));
    if (old?.file_path) await getSupabase().storage.from('study-resources').remove([old.file_path]);
  },
  setSyllabusPublished: async (subjectId: number, is_published: boolean) => { await result(getSupabase().from('subject_syllabi').update({ is_published }).eq('subject_id', subjectId)); },
  updateSyllabusMetadata: async (subjectId: number, metadata: { title: string; description: string }) => { await result(getSupabase().from('subject_syllabi').update(metadata).eq('subject_id', subjectId)); },
  deleteSyllabus: async (subjectId: number) => { const old = await result<Row | null>(getSupabase().from('subject_syllabi').select('file_path').eq('subject_id', subjectId).maybeSingle()); await result(getSupabase().from('subject_syllabi').delete().eq('subject_id', subjectId)); if (old?.file_path) await getSupabase().storage.from('study-resources').remove([old.file_path]); },
  syllabusUrl: async (path: string, download = false) => { const { data, error } = await getSupabase().storage.from('study-resources').createSignedUrl(path, 300, { download: download ? true : undefined }); if (error) throw new Error(error.message); return data.signedUrl; },
  createQuestion: async (payload: Record<string, unknown>) => {
    const question = { ...payload };
    const answerFields = ['short_answer', 'detailed_explanation', 'code_snippet', 'code_language', 'formula_text', 'diagram_key', 'expected_marks'];
    const answer = Object.fromEntries(answerFields.filter((key) => question[key] !== undefined).map((key) => [key, question[key]]));
    for (const key of answerFields) delete question[key];
    if (answer.short_answer) question.is_solved = true;
    const id = await insertId('questions', question);
    if (answer.short_answer) await result(getSupabase().from('answers').insert({ question_id: id, ...answer }));
    return { id };
  },
  patchQuestion: async (id: number, payload: Record<string, unknown>) => { await result(getSupabase().from('questions').update(payload).eq('id', id)); return { ok: true }; },
  deleteQuestion: async (id: number) => deleteRow('questions', id),
  createProgram: async (payload: Record<string, unknown>) => ({ id: await insertId('programs', { ...payload, problem_statement: payload.problem_statement || payload.description || '' }) }),
  patchProgram: async (id: number, payload: Record<string, unknown>) => { await result(getSupabase().from('programs').update(payload).eq('id', id)); return { ok: true }; },
  deleteProgram: async (id: number) => deleteRow('programs', id),
  createRevisionItem: async (payload: Record<string, unknown>) => ({ id: await insertId('revision_items', payload) }),
  patchRevisionItem: async (id: number, payload: Record<string, unknown>) => { await result(getSupabase().from('revision_items').update(payload).eq('id', id)); return { ok: true }; },
  deleteRevisionItem: async (id: number) => deleteRow('revision_items', id),
  bulkImport: async (payload: { entityType: 'questions' | 'topics' | 'resources' | 'programs' | 'revision_items'; subjectId: number; moduleId?: number | null; items: Array<Record<string, unknown>> }) => {
    let inserted = 0;
    const moduleNumbers = [...new Set(payload.items.map((item) => Number(item.module_number)).filter((value) => Number.isInteger(value) && value > 0))];
    const modules = moduleNumbers.length
      ? await result<Row[]>(getSupabase().from('modules').select('id,module_number').eq('subject_id', payload.subjectId).in('module_number', moduleNumbers))
      : [];
    const moduleIdByNumber = new Map(modules.map((module) => [Number(module.module_number), Number(module.id)]));
    for (const item of payload.items) {
      const module_id = item.module_number
        ? moduleIdByNumber.get(Number(item.module_number)) ?? null
        : item.module_id ? Number(item.module_id) : payload.moduleId ?? null;
      if (item.module_number && !module_id) throw new Error(`Module ${item.module_number} is not configured for this subject.`);
      const { module_number: _moduleNumber, ...record } = item;
      if (payload.entityType === 'topics') {
        await api.createTopic({ ...record, subject_id: payload.subjectId, module_id });
      } else if (payload.entityType === 'resources') {
        await api.createResource({ ...record, subject_id: payload.subjectId, module_id });
      } else if (payload.entityType === 'questions') {
        await api.createQuestion({ ...record, subject_id: payload.subjectId, module_id });
      } else if (payload.entityType === 'programs') {
        await api.createProgram({ ...record, subject_id: payload.subjectId, module_id });
      } else {
        await api.createRevisionItem({ ...record, subject_id: payload.subjectId, module_id });
      }
      inserted++;
    }
    return { ok: true, inserted };
  },
};

async function insertId(table: string, payload: Record<string, unknown>): Promise<number> {
  const row = await result<Row>(getSupabase().from(table).insert(payload).select('id').single());
  return Number(row.id);
}

async function deleteRow(table: string, id: number): Promise<{ ok: boolean }> {
  await result(getSupabase().from(table).delete().eq('id', id));
  return { ok: true };
}
