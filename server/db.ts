import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.env.APP_DATA_DIR || path.join(process.cwd(), 'data'));
export const UPLOADS_DIR = path.resolve(
  process.env.UPLOADS_DIR || path.join(process.cwd(), 'storage', 'uploads')
);

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, 'studyhub.db');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS universities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      short_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(university_id, name)
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      start_year INTEGER NOT NULL,
      end_year INTEGER NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      short_name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL UNIQUE,
      label TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
      scheme_id INTEGER NOT NULL REFERENCES schemes(id) ON DELETE RESTRICT,
      academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
      semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      short_description TEXT NOT NULL DEFAULT '',
      course_type TEXT NOT NULL DEFAULT 'Theory',
      credits INTEGER NOT NULL DEFAULT 3,
      cie_marks INTEGER NOT NULL DEFAULT 40,
      ese_marks INTEGER NOT NULL DEFAULT 60,
      content_focus TEXT NOT NULL DEFAULT 'theory',
      syllabus_summary TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      module_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      syllabus_text TEXT NOT NULL DEFAULT '',
      estimated_hours INTEGER NOT NULL DEFAULT 8,
      is_published INTEGER NOT NULL DEFAULT 1,
      UNIQUE(subject_id, module_number)
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      importance TEXT NOT NULL DEFAULT 'important' CHECK (importance IN ('must_study', 'important', 'additional')),
      content_type TEXT NOT NULL DEFAULT 'theory',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
      academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      scheme_id INTEGER REFERENCES schemes(id) ON DELETE SET NULL,
      semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
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
      file_size_bytes INTEGER,
      mime_type TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
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
      is_solved INTEGER NOT NULL DEFAULT 0,
      is_important INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
      short_answer TEXT NOT NULL,
      detailed_explanation TEXT,
      code_snippet TEXT,
      code_language TEXT DEFAULT 'java',
      formula_text TEXT,
      diagram_key TEXT,
      expected_marks INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      problem_statement TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'java',
      code TEXT NOT NULL,
      sample_input TEXT,
      sample_output TEXT,
      explanation TEXT,
      importance TEXT NOT NULL DEFAULT 'important' CHECK (importance IN ('must_study', 'important', 'additional')),
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS revision_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
      category TEXT NOT NULL CHECK (category IN (
        'definition', 'concept', 'formula', 'syntax', 'comparison', 'diagram', 'program', 'faq'
      )),
      title TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      code_snippet TEXT,
      diagram_key TEXT,
      importance TEXT NOT NULL DEFAULT 'must_study' CHECK (importance IN ('must_study', 'important', 'additional')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_subjects_scope ON subjects(university_id, scheme_id, branch_id, semester_id);
    CREATE INDEX IF NOT EXISTS idx_modules_subject ON modules(subject_id, module_number);
    CREATE INDEX IF NOT EXISTS idx_topics_module ON topics(module_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject_id, resource_type, is_published);
    CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id, module_id, question_type);
    CREATE INDEX IF NOT EXISTS idx_programs_subject ON programs(subject_id, module_id);
    CREATE INDEX IF NOT EXISTS idx_revision_subject ON revision_items(subject_id, module_id);
  `);

  dbInstance = db;
  return db;
}
