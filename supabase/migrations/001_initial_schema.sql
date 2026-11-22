-- KTU S3 Study Hub — Production PostgreSQL + Supabase Schema & Row Level Security
-- Run this migration in your Supabase SQL Editor to deploy with hosted PostgreSQL, Auth, and Storage.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Academic Hierarchy Entities
CREATE TABLE IF NOT EXISTS universities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schemes (
  id BIGSERIAL PRIMARY KEY,
  university_id BIGINT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (university_id, name)
);

CREATE TABLE IF NOT EXISTS academic_years (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS semesters (
  id BIGSERIAL PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  label TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS subjects (
  id BIGSERIAL PRIMARY KEY,
  university_id BIGINT NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  scheme_id BIGINT NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
  academic_year_id BIGINT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  semester_id BIGINT NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  course_type TEXT NOT NULL DEFAULT 'Theory',
  credits INTEGER NOT NULL DEFAULT 3,
  cie_marks INTEGER NOT NULL DEFAULT 40,
  ese_marks INTEGER NOT NULL DEFAULT 60,
  content_focus TEXT NOT NULL DEFAULT 'theory',
  syllabus_summary TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  syllabus_text TEXT NOT NULL DEFAULT '',
  estimated_hours INTEGER NOT NULL DEFAULT 8,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (subject_id, module_number)
);

CREATE TABLE IF NOT EXISTS topics (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  module_id BIGINT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  importance TEXT NOT NULL DEFAULT 'important' CHECK (importance IN ('must_study', 'important', 'additional')),
  content_type TEXT NOT NULL DEFAULT 'theory',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS resources (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES modules(id) ON DELETE SET NULL,
  topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL,
  academic_year_id BIGINT REFERENCES academic_years(id) ON DELETE SET NULL,
  scheme_id BIGINT REFERENCES schemes(id) ON DELETE SET NULL,
  semester_id BIGINT REFERENCES semesters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'exam_notes', 'original_notes', 'handwritten_notes', 'reference_notes',
    'syllabus', 'pyq', 'model_paper', 'solved_paper', 'diagram', 'quick_revision'
  )),
  source_category TEXT NOT NULL DEFAULT 'simplified_ai_notes' CHECK (source_category IN (
    'official_document', 'original_student_notes', 'simplified_ai_notes', 'faculty_notes', 'practice_material'
  )),
  importance TEXT NOT NULL DEFAULT 'important' CHECK (importance IN ('must_study', 'important', 'additional')),
  content_format TEXT NOT NULL DEFAULT 'markdown' CHECK (content_format IN ('markdown', 'pdf', 'mixed')),
  exam_type TEXT CHECK (exam_type IN ('regular', 'supplementary', 'model', 'verified')),
  exam_year TEXT,
  content_markdown TEXT,
  diagram_key TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES modules(id) ON DELETE SET NULL,
  topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'short_answer', 'descriptive', 'definition', 'programming',
    'numerical', 'comparison', 'diagram', 'problem_solving'
  )),
  marks INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  importance TEXT NOT NULL DEFAULT 'important' CHECK (importance IN ('must_study', 'important', 'additional')),
  source_label TEXT NOT NULL DEFAULT 'Practice Bank',
  source_category TEXT NOT NULL DEFAULT 'practice_material',
  exam_year TEXT,
  is_solved BOOLEAN NOT NULL DEFAULT FALSE,
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
  short_answer TEXT NOT NULL,
  detailed_explanation TEXT,
  code_snippet TEXT,
  code_language TEXT DEFAULT 'java',
  formula_text TEXT,
  diagram_key TEXT,
  expected_marks INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programs (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES modules(id) ON DELETE SET NULL,
  topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  problem_statement TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'java',
  code TEXT NOT NULL,
  sample_input TEXT,
  sample_output TEXT,
  explanation TEXT,
  importance TEXT NOT NULL DEFAULT 'important' CHECK (importance IN ('must_study', 'important', 'additional')),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revision_items (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  module_id BIGINT REFERENCES modules(id) ON DELETE SET NULL,
  topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'definition', 'concept', 'formula', 'syntax', 'comparison', 'diagram', 'program', 'faq'
  )),
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  code_snippet TEXT,
  diagram_key TEXT,
  importance TEXT NOT NULL DEFAULT 'must_study' CHECK (importance IN ('must_study', 'important', 'additional')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast subject/module/search queries
CREATE INDEX IF NOT EXISTS idx_subjects_scope ON subjects(university_id, scheme_id, branch_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_modules_subject ON modules(subject_id, module_number);
CREATE INDEX IF NOT EXISTS idx_topics_module ON topics(module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_resources_subject_type ON resources(subject_id, resource_type, is_published);
CREATE INDEX IF NOT EXISTS idx_questions_subject_module ON questions(subject_id, module_id, question_type);
CREATE INDEX IF NOT EXISTS idx_programs_subject_module ON programs(subject_id, module_id);
CREATE INDEX IF NOT EXISTS idx_revision_subject_module ON revision_items(subject_id, module_id);

-- Security Helper: check if current authenticated Supabase user is in admins table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE id = auth.uid()
  );
$$;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Public Read Policies (anonymous students can browse published resources freely)
CREATE POLICY "Public read universities" ON universities FOR SELECT USING (true);
CREATE POLICY "Public read schemes" ON schemes FOR SELECT USING (true);
CREATE POLICY "Public read academic_years" ON academic_years FOR SELECT USING (true);
CREATE POLICY "Public read branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Public read semesters" ON semesters FOR SELECT USING (true);
CREATE POLICY "Public read published subjects" ON subjects FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "Public read published modules" ON modules FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
CREATE POLICY "Public read published topics" ON topics FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
CREATE POLICY "Public read published resources" ON resources FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
CREATE POLICY "Public read published questions" ON questions FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
CREATE POLICY "Public read answers" ON answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.questions q JOIN public.subjects s ON s.id = q.subject_id WHERE q.id = question_id AND ((q.is_published = true AND s.is_published = true) OR public.is_admin()))
);
CREATE POLICY "Public read published programs" ON programs FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
CREATE POLICY "Public read published revision" ON revision_items FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
CREATE POLICY "Admin read self" ON admins FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- Admin Write Policies
CREATE POLICY "Admin write universities" ON universities FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write schemes" ON schemes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write academic_years" ON academic_years FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write branches" ON branches FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write semesters" ON semesters FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write subjects" ON subjects FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write modules" ON modules FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write topics" ON topics FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write resources" ON resources FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write questions" ON questions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write answers" ON answers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write programs" ON programs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin write revision" ON revision_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Supabase Storage Bucket & Policies for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-resources', 'study-resources', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read study-resources" ON storage.objects
  FOR SELECT USING (bucket_id = 'study-resources');

CREATE POLICY "Admin upload study-resources" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'study-resources' AND public.is_admin());

CREATE POLICY "Admin update study-resources" ON storage.objects
  FOR UPDATE USING (bucket_id = 'study-resources' AND public.is_admin());

CREATE POLICY "Admin delete study-resources" ON storage.objects
  FOR DELETE USING (bucket_id = 'study-resources' AND public.is_admin());

-- Data API privileges. RLS remains the row-level authorization boundary.
GRANT SELECT ON universities, schemes, academic_years, branches, semesters, subjects, modules, topics, resources, questions, answers, programs, revision_items TO anon, authenticated;
GRANT SELECT ON admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON universities, schemes, academic_years, branches, semesters, subjects, modules, topics, resources, questions, answers, programs, revision_items TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;
