export type ImportanceLevel = 'must_study' | 'important' | 'additional';

export type ContentType =
  | 'theory'
  | 'programming'
  | 'mathematical'
  | 'numerical'
  | 'diagram'
  | 'derivation';

export type ResourceType =
  | 'exam_notes'
  | 'original_notes'
  | 'handwritten_notes'
  | 'reference_notes'
  | 'syllabus'
  | 'pyq'
  | 'model_paper'
  | 'solved_paper'
  | 'diagram'
  | 'quick_revision';

export type SourceCategory =
  | 'official_document'
  | 'original_student_notes'
  | 'simplified_ai_notes'
  | 'faculty_notes'
  | 'practice_material';

export type ExamType = 'regular' | 'supplementary' | 'model' | 'verified';

export type QuestionType =
  | 'short_answer'
  | 'descriptive'
  | 'definition'
  | 'programming'
  | 'numerical'
  | 'comparison'
  | 'diagram'
  | 'problem_solving';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type RevisionCategory =
  | 'definition'
  | 'concept'
  | 'formula'
  | 'syntax'
  | 'comparison'
  | 'diagram'
  | 'program'
  | 'faq';

export interface University {
  id: number;
  name: string;
  code: string;
  short_name: string;
  created_at: string;
}

export interface Scheme {
  id: number;
  university_id: number;
  name: string;
  year: number;
  is_active: boolean;
}

export interface AcademicYear {
  id: number;
  label: string;
  start_year: number;
  end_year: number;
  is_current: boolean;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  short_name: string;
  description: string;
}

export interface Semester {
  id: number;
  number: number;
  label: string;
  code: string;
}

export interface Subject {
  id: number;
  university_id: number;
  scheme_id: number;
  academic_year_id: number;
  branch_id: number;
  semester_id: number;
  code: string;
  name: string;
  short_description: string;
  course_type: string;
  credits: number;
  cie_marks: number;
  ese_marks: number;
  content_focus: ContentType;
  syllabus_summary: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Computed fields returned by API
  module_count?: number;
  resource_count?: number;
  question_count?: number;
  program_count?: number;
  topic_count?: number;
  branch_code?: string;
  branch_name?: string;
  semester_code?: string;
  semester_label?: string;
  scheme_name?: string;
  university_code?: string;
}

export interface ModuleItem {
  id: number;
  subject_id: number;
  module_number: number;
  title: string;
  description: string;
  syllabus_text: string;
  estimated_hours: number;
  is_published: boolean;
  topic_count?: number;
  resource_count?: number;
  question_count?: number;
}

export interface Topic {
  id: number;
  subject_id: number;
  module_id: number;
  title: string;
  slug: string;
  summary: string;
  importance: ImportanceLevel;
  content_type: ContentType;
  sort_order: number;
  is_published: boolean;
}

export interface Resource {
  id: number;
  subject_id: number;
  module_id: number | null;
  topic_id: number | null;
  academic_year_id: number | null;
  scheme_id: number | null;
  semester_id: number | null;
  title: string;
  description: string;
  resource_type: ResourceType;
  source_category: SourceCategory;
  importance: ImportanceLevel;
  content_format: 'markdown' | 'pdf' | 'mixed';
  exam_type: ExamType | null;
  exam_year: string | null;
  content_markdown: string | null;
  diagram_key: string | null;
  file_url: string | null;
  file_path?: string | null;
  download_url?: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  category?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Joined metadata
  subject_code?: string;
  subject_name?: string;
  module_number?: number | null;
  module_title?: string | null;
  topic_title?: string | null;
  scheme_name?: string | null;
  semester_code?: string | null;
  academic_year_label?: string | null;
}

export interface SubjectSyllabus {
  id: number;
  subject_id: number;
  title: string;
  description: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  is_published: boolean;
}

export interface Answer {
  id: number;
  question_id: number;
  short_answer: string;
  detailed_explanation: string | null;
  code_snippet: string | null;
  code_language: string | null;
  formula_text: string | null;
  diagram_key: string | null;
  expected_marks: number | null;
  updated_at: string;
}

export interface Question {
  id: number;
  subject_id: number;
  module_id: number | null;
  topic_id: number | null;
  question_text: string;
  question_type: QuestionType;
  marks: number | null;
  difficulty: DifficultyLevel | null;
  importance: ImportanceLevel;
  source_label: string;
  source_category: SourceCategory;
  exam_year: string | null;
  is_solved: boolean;
  is_important: boolean;
  is_published: boolean;
  created_at: string;
  // Joined
  answer?: Answer | null;
  subject_code?: string;
  subject_name?: string;
  module_number?: number | null;
  module_title?: string | null;
  topic_title?: string | null;
}

export interface ProgramItem {
  id: number;
  subject_id: number;
  module_id: number | null;
  topic_id: number | null;
  title: string;
  description: string;
  problem_statement: string;
  language: string;
  code: string;
  sample_input: string | null;
  sample_output: string | null;
  explanation: string | null;
  importance: ImportanceLevel;
  is_published: boolean;
  created_at: string;
  subject_code?: string;
  subject_name?: string;
  module_number?: number | null;
  module_title?: string | null;
}

export interface RevisionItem {
  id: number;
  subject_id: number;
  module_id: number | null;
  topic_id: number | null;
  category: RevisionCategory;
  title: string;
  content_markdown: string;
  code_snippet: string | null;
  diagram_key: string | null;
  importance: ImportanceLevel;
  sort_order: number;
  is_published: boolean;
  subject_code?: string;
  subject_name?: string;
  module_number?: number | null;
  module_title?: string | null;
}

export interface HierarchyData {
  universities: University[];
  schemes: Scheme[];
  academicYears: AcademicYear[];
  branches: Branch[];
  semesters: Semester[];
}

export interface SearchResultItem {
  kind: 'subject' | 'module' | 'topic' | 'resource' | 'question' | 'program' | 'revision';
  id: number;
  title: string;
  snippet: string;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  module_number: number | null;
  module_title: string | null;
  resource_type?: string;
  importance?: ImportanceLevel;
  exam_year?: string | null;
  url: string;
}

export interface AdminUser {
  id: number | string;
  email: string;
  name: string;
  role: string;
}
