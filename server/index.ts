import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { getDb, UPLOADS_DIR } from './db.ts';
import { seedDatabase } from './seed.ts';
import {
  requireAdmin,
  signAdminToken,
  verifyAdminToken,
  verifyPassword,
  type AuthedRequest,
} from './auth.ts';
import type { SearchResultItem } from '../shared/types.ts';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configure Multer for PDF & academic resource uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .slice(0, 60);
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.md', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Upload PDF, PNG, JPG, WEBP, MD, or TXT.'));
    }
  },
});

function isAdminRequest(req: express.Request): boolean {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return Boolean(token && verifyAdminToken(token));
}

function toBool(v: unknown): boolean {
  return Boolean(Number(v));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ktu-s3-study-hub-api' });
});

// Serve uploaded / generated PDFs safely
app.get('/api/files/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  const fullPath = path.join(UPLOADS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  const download = req.query.download === '1' || req.query.download === 'true';
  if (safeName.toLowerCase().endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
  }
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${safeName}"`
  );
  res.sendFile(fullPath);
});

// Hierarchy endpoint
app.get('/api/hierarchy', (_req, res) => {
  const db = getDb();
  const universities = db.prepare('SELECT * FROM universities ORDER BY id').all();
  const schemes = db.prepare('SELECT * FROM schemes ORDER BY year DESC, id').all().map((s: Record<string, unknown>) => ({
    ...s,
    is_active: toBool(s.is_active),
  }));
  const academicYears = db.prepare('SELECT * FROM academic_years ORDER BY start_year DESC').all().map((a: Record<string, unknown>) => ({
    ...a,
    is_current: toBool(a.is_current),
  }));
  const branches = db.prepare('SELECT * FROM branches ORDER BY id').all();
  const semesters = db.prepare('SELECT * FROM semesters ORDER BY number').all();

  res.json({ universities, schemes, academicYears, branches, semesters });
});

// Subjects list
app.get('/api/subjects', (req, res) => {
  const db = getDb();
  const adminMode = isAdminRequest(req) && req.query.includeUnpublished === '1';
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (!adminMode) {
    conditions.push('s.is_published = 1');
  }
  if (req.query.universityId) {
    conditions.push('s.university_id = ?');
    params.push(Number(req.query.universityId));
  }
  if (req.query.schemeId) {
    conditions.push('s.scheme_id = ?');
    params.push(Number(req.query.schemeId));
  }
  if (req.query.branchId) {
    conditions.push('s.branch_id = ?');
    params.push(Number(req.query.branchId));
  }
  if (req.query.semesterId) {
    conditions.push('s.semester_id = ?');
    params.push(Number(req.query.semesterId));
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT s.*,
        u.code AS university_code,
        sc.name AS scheme_name,
        b.code AS branch_code,
        b.name AS branch_name,
        sem.code AS semester_code,
        sem.label AS semester_label,
        (SELECT COUNT(*) FROM modules m WHERE m.subject_id = s.id AND m.is_published = 1) AS module_count,
        (SELECT COUNT(*) FROM resources r WHERE r.subject_id = s.id AND r.is_published = 1) AS resource_count,
        (SELECT COUNT(*) FROM questions q WHERE q.subject_id = s.id AND q.is_published = 1) AS question_count,
        (SELECT COUNT(*) FROM programs p WHERE p.subject_id = s.id AND p.is_published = 1) AS program_count,
        (SELECT COUNT(*) FROM topics t WHERE t.subject_id = s.id AND t.is_published = 1) AS topic_count
      FROM subjects s
      JOIN universities u ON u.id = s.university_id
      JOIN schemes sc ON sc.id = s.scheme_id
      JOIN branches b ON b.id = s.branch_id
      JOIN semesters sem ON sem.id = s.semester_id
      ${where}
      ORDER BY s.sort_order ASC, s.code ASC
    `)
    .all(...params)
    .map((r: Record<string, unknown>) => ({ ...r, is_published: toBool(r.is_published) }));

  res.json(rows);
});

// Single Subject Detail (by code or id)
app.get('/api/subjects/:codeOrId', (req, res) => {
  const db = getDb();
  const key = req.params.codeOrId;
  const adminMode = isAdminRequest(req);
  const byId = /^\d+$/.test(key);
  const subject = db
    .prepare(`
      SELECT s.*,
        u.code AS university_code, u.name AS university_name,
        sc.name AS scheme_name,
        b.code AS branch_code, b.name AS branch_name,
        sem.code AS semester_code, sem.label AS semester_label
      FROM subjects s
      JOIN universities u ON u.id = s.university_id
      JOIN schemes sc ON sc.id = s.scheme_id
      JOIN branches b ON b.id = s.branch_id
      JOIN semesters sem ON sem.id = s.semester_id
      WHERE ${byId ? 's.id = ?' : 'UPPER(s.code) = UPPER(?)'}
      ${adminMode ? '' : 'AND s.is_published = 1'}
    `)
    .get(byId ? Number(key) : key) as Record<string, unknown> | undefined;

  if (!subject) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }

  const subjectId = Number(subject.id);
  const modules = db
    .prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM topics t WHERE t.module_id = m.id AND t.is_published = 1) AS topic_count,
        (SELECT COUNT(*) FROM resources r WHERE r.module_id = m.id AND r.is_published = 1) AS resource_count,
        (SELECT COUNT(*) FROM questions q WHERE q.module_id = m.id AND q.is_published = 1) AS question_count
      FROM modules m
      WHERE m.subject_id = ? ${adminMode ? '' : 'AND m.is_published = 1'}
      ORDER BY m.module_number ASC
    `)
    .all(subjectId)
    .map((m: Record<string, unknown>) => ({ ...m, is_published: toBool(m.is_published) }));

  const topics = db
    .prepare(`SELECT * FROM topics WHERE subject_id = ? ${adminMode ? '' : 'AND is_published = 1'} ORDER BY sort_order ASC, id ASC`)
    .all(subjectId)
    .map((t: Record<string, unknown>) => ({ ...t, is_published: toBool(t.is_published) }));

  const resources = db
    .prepare(`
      SELECT r.*, m.module_number, m.title AS module_title, t.title AS topic_title,
        sc.name AS scheme_name, sem.code AS semester_code, ay.label AS academic_year_label
      FROM resources r
      LEFT JOIN modules m ON m.id = r.module_id
      LEFT JOIN topics t ON t.id = r.topic_id
      LEFT JOIN schemes sc ON sc.id = r.scheme_id
      LEFT JOIN semesters sem ON sem.id = r.semester_id
      LEFT JOIN academic_years ay ON ay.id = r.academic_year_id
      WHERE r.subject_id = ? ${adminMode ? '' : 'AND r.is_published = 1'}
      ORDER BY r.created_at DESC, r.id DESC
    `)
    .all(subjectId)
    .map((r: Record<string, unknown>) => ({ ...r, is_published: toBool(r.is_published) }));

  const questionsRaw = db
    .prepare(`
      SELECT q.*, m.module_number, m.title AS module_title, t.title AS topic_title
      FROM questions q
      LEFT JOIN modules m ON m.id = q.module_id
      LEFT JOIN topics t ON t.id = q.topic_id
      WHERE q.subject_id = ? ${adminMode ? '' : 'AND q.is_published = 1'}
      ORDER BY q.id ASC
    `)
    .all(subjectId) as Array<Record<string, unknown>>;

  const answersByQ = new Map<number, Record<string, unknown>>();
  const answerRows = db
    .prepare(`
      SELECT a.* FROM answers a
      JOIN questions q ON q.id = a.question_id
      WHERE q.subject_id = ?
    `)
    .all(subjectId) as Array<Record<string, unknown>>;
  for (const a of answerRows) {
    answersByQ.set(Number(a.question_id), a);
  }

  const questions = questionsRaw.map((q) => ({
    ...q,
    is_solved: toBool(q.is_solved),
    is_important: toBool(q.is_important),
    is_published: toBool(q.is_published),
    answer: answersByQ.get(Number(q.id)) || null,
  }));

  const programs = db
    .prepare(`
      SELECT p.*, m.module_number, m.title AS module_title
      FROM programs p
      LEFT JOIN modules m ON m.id = p.module_id
      WHERE p.subject_id = ? ${adminMode ? '' : 'AND p.is_published = 1'}
      ORDER BY p.id ASC
    `)
    .all(subjectId)
    .map((p: Record<string, unknown>) => ({ ...p, is_published: toBool(p.is_published) }));

  const revisionItems = db
    .prepare(`
      SELECT ri.*, m.module_number, m.title AS module_title
      FROM revision_items ri
      LEFT JOIN modules m ON m.id = ri.module_id
      WHERE ri.subject_id = ? ${adminMode ? '' : 'AND ri.is_published = 1'}
      ORDER BY ri.sort_order ASC, ri.id ASC
    `)
    .all(subjectId)
    .map((ri: Record<string, unknown>) => ({ ...ri, is_published: toBool(ri.is_published) }));

  res.json({
    subject: { ...subject, is_published: toBool(subject.is_published) },
    modules,
    topics,
    resources,
    questions,
    programs,
    revisionItems,
  });
});

// Single Module Detail (strictly scoped to subject + moduleNumber)
app.get('/api/subjects/:codeOrId/modules/:moduleNumber', (req, res) => {
  const db = getDb();
  const key = req.params.codeOrId;
  const moduleNum = Number(req.params.moduleNumber);
  const byId = /^\d+$/.test(key);

  const subject = db
    .prepare(`
      SELECT s.*, b.code AS branch_code, b.name AS branch_name, sem.code AS semester_code, sc.name AS scheme_name
      FROM subjects s
      JOIN branches b ON b.id = s.branch_id
      JOIN semesters sem ON sem.id = s.semester_id
      JOIN schemes sc ON sc.id = s.scheme_id
      WHERE ${byId ? 's.id = ?' : 'UPPER(s.code) = UPPER(?)'} AND s.is_published = 1
    `)
    .get(byId ? Number(key) : key) as Record<string, unknown> | undefined;

  if (!subject) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }

  const subjectId = Number(subject.id);
  const moduleRow = db
    .prepare('SELECT * FROM modules WHERE subject_id = ? AND module_number = ? AND is_published = 1')
    .get(subjectId, moduleNum) as Record<string, unknown> | undefined;

  if (!moduleRow) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  const moduleId = Number(moduleRow.id);
  const allModules = db
    .prepare('SELECT id, module_number, title FROM modules WHERE subject_id = ? AND is_published = 1 ORDER BY module_number')
    .all(subjectId);

  const topics = db
    .prepare('SELECT * FROM topics WHERE subject_id = ? AND module_id = ? AND is_published = 1 ORDER BY sort_order, id')
    .all(subjectId, moduleId)
    .map((t: Record<string, unknown>) => ({ ...t, is_published: toBool(t.is_published) }));

  const resources = db
    .prepare(`
      SELECT r.*, t.title AS topic_title
      FROM resources r
      LEFT JOIN topics t ON t.id = r.topic_id
      WHERE r.subject_id = ? AND r.module_id = ? AND r.is_published = 1
      ORDER BY r.id ASC
    `)
    .all(subjectId, moduleId)
    .map((r: Record<string, unknown>) => ({ ...r, is_published: toBool(r.is_published) }));

  // Subject-wide PYQs/Model papers can also be relevant if module_id is null
  const subjectLevelPapers = db
    .prepare(`
      SELECT r.* FROM resources r
      WHERE r.subject_id = ? AND r.module_id IS NULL AND r.resource_type IN ('pyq', 'model_paper', 'solved_paper') AND r.is_published = 1
    `)
    .all(subjectId)
    .map((r: Record<string, unknown>) => ({ ...r, is_published: toBool(r.is_published) }));

  const questionsRaw = db
    .prepare(`
      SELECT q.*, t.title AS topic_title
      FROM questions q
      LEFT JOIN topics t ON t.id = q.topic_id
      WHERE q.subject_id = ? AND q.module_id = ? AND q.is_published = 1
      ORDER BY q.id ASC
    `)
    .all(subjectId, moduleId) as Array<Record<string, unknown>>;

  const answersMap = new Map<number, Record<string, unknown>>();
  const answerRows = db
    .prepare(`
      SELECT a.* FROM answers a
      JOIN questions q ON q.id = a.question_id
      WHERE q.subject_id = ? AND q.module_id = ?
    `)
    .all(subjectId, moduleId) as Array<Record<string, unknown>>;
  for (const a of answerRows) answersMap.set(Number(a.question_id), a);

  const questions = questionsRaw.map((q) => ({
    ...q,
    is_solved: toBool(q.is_solved),
    is_important: toBool(q.is_important),
    is_published: toBool(q.is_published),
    answer: answersMap.get(Number(q.id)) || null,
  }));

  const programs = db
    .prepare('SELECT * FROM programs WHERE subject_id = ? AND module_id = ? AND is_published = 1 ORDER BY id ASC')
    .all(subjectId, moduleId)
    .map((p: Record<string, unknown>) => ({ ...p, is_published: toBool(p.is_published) }));

  const revisionItems = db
    .prepare('SELECT * FROM revision_items WHERE subject_id = ? AND module_id = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC')
    .all(subjectId, moduleId)
    .map((ri: Record<string, unknown>) => ({ ...ri, is_published: toBool(ri.is_published) }));

  res.json({
    subject: { ...subject, is_published: toBool(subject.is_published) },
    module: { ...moduleRow, is_published: toBool(moduleRow.is_published) },
    allModules,
    topics,
    resources,
    subjectLevelPapers,
    questions,
    programs,
    revisionItems,
  });
});

// Central Resources endpoint (Notes Library, PYQs, Syllabus)
app.get('/api/resources', (req, res) => {
  const db = getDb();
  const adminMode = isAdminRequest(req) && req.query.includeUnpublished === '1';
  const conds: string[] = [];
  const params: Array<string | number> = [];

  if (!adminMode) {
    conds.push('r.is_published = 1 AND s.is_published = 1');
  }
  if (req.query.subjectId) {
    conds.push('r.subject_id = ?');
    params.push(Number(req.query.subjectId));
  }
  if (req.query.moduleId) {
    conds.push('r.module_id = ?');
    params.push(Number(req.query.moduleId));
  }
  if (req.query.resourceType) {
    const types = String(req.query.resourceType).split(',').map((t) => t.trim()).filter(Boolean);
    if (types.length > 0) {
      conds.push(`r.resource_type IN (${types.map(() => '?').join(',')})`);
      params.push(...types);
    }
  }
  if (req.query.examType) {
    conds.push('r.exam_type = ?');
    params.push(String(req.query.examType));
  }
  if (req.query.importance) {
    conds.push('r.importance = ?');
    params.push(String(req.query.importance));
  }
  if (req.query.schemeId) {
    conds.push('COALESCE(r.scheme_id, s.scheme_id) = ?');
    params.push(Number(req.query.schemeId));
  }
  if (req.query.semesterId) {
    conds.push('COALESCE(r.semester_id, s.semester_id) = ?');
    params.push(Number(req.query.semesterId));
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT r.*,
        s.code AS subject_code, s.name AS subject_name,
        m.module_number, m.title AS module_title,
        t.title AS topic_title,
        sc.name AS scheme_name,
        sem.code AS semester_code,
        ay.label AS academic_year_label
      FROM resources r
      JOIN subjects s ON s.id = r.subject_id
      LEFT JOIN modules m ON m.id = r.module_id
      LEFT JOIN topics t ON t.id = r.topic_id
      LEFT JOIN schemes sc ON sc.id = COALESCE(r.scheme_id, s.scheme_id)
      LEFT JOIN semesters sem ON sem.id = COALESCE(r.semester_id, s.semester_id)
      LEFT JOIN academic_years ay ON ay.id = COALESCE(r.academic_year_id, s.academic_year_id)
      ${where}
      ORDER BY r.created_at DESC, r.id DESC
    `)
    .all(...params)
    .map((r: Record<string, unknown>) => ({ ...r, is_published: toBool(r.is_published) }));

  res.json(rows);
});

// Central Questions & Solved Answers endpoint
app.get('/api/questions', (req, res) => {
  const db = getDb();
  const adminMode = isAdminRequest(req) && req.query.includeUnpublished === '1';
  const conds: string[] = [];
  const params: Array<string | number> = [];

  if (!adminMode) {
    conds.push('q.is_published = 1 AND s.is_published = 1');
  }
  if (req.query.subjectId) {
    conds.push('q.subject_id = ?');
    params.push(Number(req.query.subjectId));
  }
  if (req.query.moduleId) {
    conds.push('q.module_id = ?');
    params.push(Number(req.query.moduleId));
  }
  if (req.query.questionType) {
    conds.push('q.question_type = ?');
    params.push(String(req.query.questionType));
  }
  if (req.query.importance) {
    conds.push('q.importance = ?');
    params.push(String(req.query.importance));
  }
  if (req.query.difficulty) {
    conds.push('q.difficulty = ?');
    params.push(String(req.query.difficulty));
  }
  if (req.query.solvedOnly === '1') {
    conds.push('q.is_solved = 1');
  }
  if (req.query.importantOnly === '1') {
    conds.push('q.is_important = 1');
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT q.*,
        s.code AS subject_code, s.name AS subject_name,
        m.module_number, m.title AS module_title,
        t.title AS topic_title
      FROM questions q
      JOIN subjects s ON s.id = q.subject_id
      LEFT JOIN modules m ON m.id = q.module_id
      LEFT JOIN topics t ON t.id = q.topic_id
      ${where}
      ORDER BY q.id ASC
    `)
    .all(...params) as Array<Record<string, unknown>>;

  const answerRows = db.prepare('SELECT * FROM answers').all() as Array<Record<string, unknown>>;
  const answersMap = new Map<number, Record<string, unknown>>();
  for (const a of answerRows) answersMap.set(Number(a.question_id), a);

  res.json(
    rows.map((q) => ({
      ...q,
      is_solved: toBool(q.is_solved),
      is_important: toBool(q.is_important),
      is_published: toBool(q.is_published),
      answer: answersMap.get(Number(q.id)) || null,
    }))
  );
});

// Central Programs endpoint
app.get('/api/programs', (req, res) => {
  const db = getDb();
  const adminMode = isAdminRequest(req) && req.query.includeUnpublished === '1';
  const conds: string[] = [];
  const params: Array<string | number> = [];

  if (!adminMode) conds.push('p.is_published = 1 AND s.is_published = 1');
  if (req.query.subjectId) {
    conds.push('p.subject_id = ?');
    params.push(Number(req.query.subjectId));
  }
  if (req.query.moduleId) {
    conds.push('p.module_id = ?');
    params.push(Number(req.query.moduleId));
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT p.*, s.code AS subject_code, s.name AS subject_name, m.module_number, m.title AS module_title
      FROM programs p
      JOIN subjects s ON s.id = p.subject_id
      LEFT JOIN modules m ON m.id = p.module_id
      ${where}
      ORDER BY p.id ASC
    `)
    .all(...params)
    .map((p: Record<string, unknown>) => ({ ...p, is_published: toBool(p.is_published) }));

  res.json(rows);
});

// Central Quick Revision endpoint
app.get('/api/revision', (req, res) => {
  const db = getDb();
  const adminMode = isAdminRequest(req) && req.query.includeUnpublished === '1';
  const conds: string[] = [];
  const params: Array<string | number> = [];

  if (!adminMode) conds.push('ri.is_published = 1 AND s.is_published = 1');
  if (req.query.subjectId) {
    conds.push('ri.subject_id = ?');
    params.push(Number(req.query.subjectId));
  }
  if (req.query.moduleId) {
    conds.push('ri.module_id = ?');
    params.push(Number(req.query.moduleId));
  }
  if (req.query.category) {
    conds.push('ri.category = ?');
    params.push(String(req.query.category));
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT ri.*, s.code AS subject_code, s.name AS subject_name, m.module_number, m.title AS module_title
      FROM revision_items ri
      JOIN subjects s ON s.id = ri.subject_id
      LEFT JOIN modules m ON m.id = ri.module_id
      ${where}
      ORDER BY ri.sort_order ASC, ri.id ASC
    `)
    .all(...params)
    .map((ri: Record<string, unknown>) => ({ ...ri, is_published: toBool(ri.is_published) }));

  res.json(rows);
});

// Global Search across ALL subjects, modules, topics, resources, questions, programs, revision items
app.get('/api/search', (req, res) => {
  const db = getDb();
  const q = String(req.query.q || '').trim();
  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;
  const moduleNumber = req.query.moduleNumber ? Number(req.query.moduleNumber) : null;
  const resourceType = req.query.resourceType ? String(req.query.resourceType) : null;
  const importance = req.query.importance ? String(req.query.importance) : null;
  const examYear = req.query.examYear ? String(req.query.examYear) : null;

  const pattern = `%${q}%`;
  const results: SearchResultItem[] = [];

  // 1. Subjects
  if (!moduleNumber && !resourceType && !importance && !examYear) {
    const subjRows = db
      .prepare(`
        SELECT id, code, name, short_description
        FROM subjects
        WHERE is_published = 1
          ${subjectId ? 'AND id = ?' : ''}
          ${q ? 'AND (code LIKE ? OR name LIKE ? OR short_description LIKE ? OR syllabus_summary LIKE ?)' : ''}
        ORDER BY sort_order ASC
      `)
      .all(...[...(subjectId ? [subjectId] : []), ...(q ? [pattern, pattern, pattern, pattern] : [])]) as Array<Record<string, unknown>>;

    for (const s of subjRows) {
      results.push({
        kind: 'subject',
        id: Number(s.id),
        title: `${s.code} — ${s.name}`,
        snippet: String(s.short_description),
        subject_id: Number(s.id),
        subject_code: String(s.code),
        subject_name: String(s.name),
        module_number: null,
        module_title: null,
        url: `/subjects/${s.code}`,
      });
    }
  }

  // 2. Modules & Topics
  if (!resourceType && !examYear) {
    if (!importance) {
      const modRows = db
        .prepare(`
          SELECT m.id, m.module_number, m.title, m.description, s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
          FROM modules m
          JOIN subjects s ON s.id = m.subject_id
          WHERE m.is_published = 1 AND s.is_published = 1
            ${subjectId ? 'AND s.id = ?' : ''}
            ${moduleNumber ? 'AND m.module_number = ?' : ''}
            ${q ? 'AND (m.title LIKE ? OR m.description LIKE ? OR m.syllabus_text LIKE ? OR s.code LIKE ?)' : ''}
        `)
        .all(
          ...[
            ...(subjectId ? [subjectId] : []),
            ...(moduleNumber ? [moduleNumber] : []),
            ...(q ? [pattern, pattern, pattern, pattern] : []),
          ]
        ) as Array<Record<string, unknown>>;

      for (const m of modRows) {
        results.push({
          kind: 'module',
          id: Number(m.id),
          title: `Module ${m.module_number}: ${m.title}`,
          snippet: String(m.description),
          subject_id: Number(m.subject_id),
          subject_code: String(m.subject_code),
          subject_name: String(m.subject_name),
          module_number: Number(m.module_number),
          module_title: String(m.title),
          url: `/subjects/${m.subject_code}/module/${m.module_number}`,
        });
      }
    }

    const topicRows = db
      .prepare(`
        SELECT t.id, t.title, t.summary, t.importance, m.module_number, m.title AS module_title,
               s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
        FROM topics t
        JOIN modules m ON m.id = t.module_id
        JOIN subjects s ON s.id = t.subject_id
        WHERE t.is_published = 1 AND s.is_published = 1
          ${subjectId ? 'AND s.id = ?' : ''}
          ${moduleNumber ? 'AND m.module_number = ?' : ''}
          ${importance ? 'AND t.importance = ?' : ''}
          ${q ? 'AND (t.title LIKE ? OR t.summary LIKE ?)' : ''}
      `)
      .all(
        ...[
          ...(subjectId ? [subjectId] : []),
          ...(moduleNumber ? [moduleNumber] : []),
          ...(importance ? [importance] : []),
          ...(q ? [pattern, pattern] : []),
        ]
      ) as Array<Record<string, unknown>>;

    for (const t of topicRows) {
      results.push({
        kind: 'topic',
        id: Number(t.id),
        title: String(t.title),
        snippet: String(t.summary),
        subject_id: Number(t.subject_id),
        subject_code: String(t.subject_code),
        subject_name: String(t.subject_name),
        module_number: Number(t.module_number),
        module_title: String(t.module_title),
        importance: t.importance as SearchResultItem['importance'],
        url: `/subjects/${t.subject_code}/module/${t.module_number}`,
      });
    }
  }

  // 3. Resources
  const resConds = ['r.is_published = 1', 's.is_published = 1'];
  const resParams: Array<string | number> = [];
  if (subjectId) { resConds.push('s.id = ?'); resParams.push(subjectId); }
  if (moduleNumber) { resConds.push('m.module_number = ?'); resParams.push(moduleNumber); }
  if (resourceType && resourceType !== 'question' && resourceType !== 'program' && resourceType !== 'revision') {
    resConds.push('r.resource_type = ?');
    resParams.push(resourceType);
  }
  if (importance) { resConds.push('r.importance = ?'); resParams.push(importance); }
  if (examYear) { resConds.push('r.exam_year LIKE ?'); resParams.push(`%${examYear}%`); }
  if (q) {
    resConds.push("(r.title LIKE ? OR r.description LIKE ? OR COALESCE(r.content_markdown, '') LIKE ? OR s.code LIKE ?)");
    resParams.push(pattern, pattern, pattern, pattern);
  }

  if (!resourceType || !['question', 'program', 'revision'].includes(resourceType)) {
    const resRows = db
      .prepare(`
        SELECT r.id, r.title, r.description, r.resource_type, r.importance, r.exam_year,
               s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
               m.module_number, m.title AS module_title
        FROM resources r
        JOIN subjects s ON s.id = r.subject_id
        LEFT JOIN modules m ON m.id = r.module_id
        WHERE ${resConds.join(' AND ')}
      `)
      .all(...resParams) as Array<Record<string, unknown>>;

    for (const r of resRows) {
      results.push({
        kind: 'resource',
        id: Number(r.id),
        title: String(r.title),
        snippet: String(r.description),
        subject_id: Number(r.subject_id),
        subject_code: String(r.subject_code),
        subject_name: String(r.subject_name),
        module_number: r.module_number ? Number(r.module_number) : null,
        module_title: r.module_title ? String(r.module_title) : null,
        resource_type: String(r.resource_type),
        importance: r.importance as SearchResultItem['importance'],
        exam_year: r.exam_year ? String(r.exam_year) : null,
        url: r.module_number
          ? `/subjects/${r.subject_code}/module/${r.module_number}`
          : `/subjects/${r.subject_code}`,
      });
    }
  }

  // 4. Questions
  if (!resourceType || resourceType === 'question') {
    const qConds = ['q.is_published = 1', 's.is_published = 1'];
    const qParams: Array<string | number> = [];
    if (subjectId) { qConds.push('s.id = ?'); qParams.push(subjectId); }
    if (moduleNumber) { qConds.push('m.module_number = ?'); qParams.push(moduleNumber); }
    if (importance) { qConds.push('q.importance = ?'); qParams.push(importance); }
    if (examYear) { qConds.push("COALESCE(q.exam_year, '') LIKE ?"); qParams.push(`%${examYear}%`); }
    if (q) {
      qConds.push("(q.question_text LIKE ? OR COALESCE(a.short_answer, '') LIKE ? OR s.code LIKE ?)");
      qParams.push(pattern, pattern, pattern);
    }

    const qRows = db
      .prepare(`
        SELECT q.id, q.question_text, q.question_type, q.importance, q.exam_year,
               a.short_answer, s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
               m.module_number, m.title AS module_title
        FROM questions q
        JOIN subjects s ON s.id = q.subject_id
        LEFT JOIN modules m ON m.id = q.module_id
        LEFT JOIN answers a ON a.question_id = q.id
        WHERE ${qConds.join(' AND ')}
      `)
      .all(...qParams) as Array<Record<string, unknown>>;

    for (const row of qRows) {
      results.push({
        kind: 'question',
        id: Number(row.id),
        title: String(row.question_text),
        snippet: row.short_answer ? String(row.short_answer) : `Question type: ${row.question_type}`,
        subject_id: Number(row.subject_id),
        subject_code: String(row.subject_code),
        subject_name: String(row.subject_name),
        module_number: row.module_number ? Number(row.module_number) : null,
        module_title: row.module_title ? String(row.module_title) : null,
        resource_type: `question:${row.question_type}`,
        importance: row.importance as SearchResultItem['importance'],
        exam_year: row.exam_year ? String(row.exam_year) : null,
        url: row.module_number
          ? `/subjects/${row.subject_code}/module/${row.module_number}#questions`
          : `/question-bank?subject=${row.subject_code}`,
      });
    }
  }

  // 5. Programs & Revision Items
  if ((!resourceType || resourceType === 'program') && !examYear) {
    const pConds = ['p.is_published = 1', 's.is_published = 1'];
    const pParams: Array<string | number> = [];
    if (subjectId) { pConds.push('s.id = ?'); pParams.push(subjectId); }
    if (moduleNumber) { pConds.push('m.module_number = ?'); pParams.push(moduleNumber); }
    if (importance) { pConds.push('p.importance = ?'); pParams.push(importance); }
    if (q) {
      pConds.push('(p.title LIKE ? OR p.description LIKE ? OR p.code LIKE ?)');
      pParams.push(pattern, pattern, pattern);
    }
    const pRows = db
      .prepare(`
        SELECT p.id, p.title, p.description, p.importance,
               s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
               m.module_number, m.title AS module_title
        FROM programs p
        JOIN subjects s ON s.id = p.subject_id
        LEFT JOIN modules m ON m.id = p.module_id
        WHERE ${pConds.join(' AND ')}
      `)
      .all(...pParams) as Array<Record<string, unknown>>;

    for (const p of pRows) {
      results.push({
        kind: 'program',
        id: Number(p.id),
        title: String(p.title),
        snippet: String(p.description),
        subject_id: Number(p.subject_id),
        subject_code: String(p.subject_code),
        subject_name: String(p.subject_name),
        module_number: p.module_number ? Number(p.module_number) : null,
        module_title: p.module_title ? String(p.module_title) : null,
        resource_type: 'program',
        importance: p.importance as SearchResultItem['importance'],
        url: p.module_number
          ? `/subjects/${p.subject_code}/module/${p.module_number}#programs`
          : `/subjects/${p.subject_code}`,
      });
    }
  }

  if ((!resourceType || resourceType === 'revision') && !examYear) {
    const riConds = ['ri.is_published = 1', 's.is_published = 1'];
    const riParams: Array<string | number> = [];
    if (subjectId) { riConds.push('s.id = ?'); riParams.push(subjectId); }
    if (moduleNumber) { riConds.push('m.module_number = ?'); riParams.push(moduleNumber); }
    if (importance) { riConds.push('ri.importance = ?'); riParams.push(importance); }
    if (q) {
      riConds.push('(ri.title LIKE ? OR ri.content_markdown LIKE ?)');
      riParams.push(pattern, pattern);
    }
    const riRows = db
      .prepare(`
        SELECT ri.id, ri.title, ri.content_markdown, ri.importance,
               s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
               m.module_number, m.title AS module_title
        FROM revision_items ri
        JOIN subjects s ON s.id = ri.subject_id
        LEFT JOIN modules m ON m.id = ri.module_id
        WHERE ${riConds.join(' AND ')}
      `)
      .all(...riParams) as Array<Record<string, unknown>>;

    for (const ri of riRows) {
      results.push({
        kind: 'revision',
        id: Number(ri.id),
        title: String(ri.title),
        snippet: String(ri.content_markdown).slice(0, 140),
        subject_id: Number(ri.subject_id),
        subject_code: String(ri.subject_code),
        subject_name: String(ri.subject_name),
        module_number: ri.module_number ? Number(ri.module_number) : null,
        module_title: ri.module_title ? String(ri.module_title) : null,
        resource_type: 'quick_revision',
        importance: ri.importance as SearchResultItem['importance'],
        url: `/quick-revision?subject=${ri.subject_code}`,
      });
    }
  }

  res.json(results.slice(0, 100));
});

// ==================== ADMIN AUTH & CMS ROUTES ====================

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const db = getDb();
  const admin = db
    .prepare('SELECT id, email, name, password_hash, role FROM admins WHERE LOWER(email) = LOWER(?)')
    .get(String(email)) as
    | { id: number; email: string; name: string; password_hash: string; role: string }
    | undefined;

  if (!admin || !verifyPassword(String(password), admin.password_hash)) {
    res.status(401).json({ error: 'Invalid admin email or password.' });
    return;
  }

  const user = { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
  const token = signAdminToken(user);
  res.json({ token, user });
});

app.get('/api/admin/me', requireAdmin, (req: AuthedRequest, res) => {
  res.json({ user: req.admin });
});

// Upload PDF/image file
app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' });
    return;
  }
  res.json({
    file_url: `/api/files/${encodeURIComponent(req.file.filename)}`,
    file_name: req.file.originalname,
    stored_name: req.file.filename,
    file_size_bytes: req.file.size,
    mime_type: req.file.mimetype,
  });
});

// Branches & Semesters CRUD
app.post('/api/admin/branches', requireAdmin, (req, res) => {
  const { name, code, short_name, description } = req.body || {};
  if (!name || !code) {
    res.status(400).json({ error: 'Branch name and code are required.' });
    return;
  }
  const db = getDb();
  try {
    const r = db
      .prepare('INSERT INTO branches (name, code, short_name, description) VALUES (?, ?, ?, ?)')
      .run(name, String(code).toUpperCase(), short_name || String(code).toUpperCase(), description || '');
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/admin/semesters', requireAdmin, (req, res) => {
  const { number, label, code } = req.body || {};
  if (!number || !label || !code) {
    res.status(400).json({ error: 'Semester number, label, and code are required.' });
    return;
  }
  const db = getDb();
  try {
    const r = db
      .prepare('INSERT INTO semesters (number, label, code) VALUES (?, ?, ?)')
      .run(Number(number), label, String(code).toUpperCase());
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Subjects CRUD
app.post('/api/admin/subjects', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.code || !b.name || !b.university_id || !b.scheme_id || !b.branch_id || !b.semester_id || !b.academic_year_id) {
    res.status(400).json({ error: 'Missing required subject fields.' });
    return;
  }
  const db = getDb();
  try {
    const r = db
      .prepare(`
        INSERT INTO subjects (
          university_id, scheme_id, academic_year_id, branch_id, semester_id,
          code, name, short_description, course_type, credits, cie_marks, ese_marks,
          content_focus, syllabus_summary, is_published, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        Number(b.university_id),
        Number(b.scheme_id),
        Number(b.academic_year_id),
        Number(b.branch_id),
        Number(b.semester_id),
        String(b.code).trim().toUpperCase(),
        String(b.name).trim(),
        b.short_description || '',
        b.course_type || 'Theory',
        Number(b.credits ?? 3),
        Number(b.cie_marks ?? 40),
        Number(b.ese_marks ?? 60),
        b.content_focus || 'theory',
        b.syllabus_summary || '',
        b.is_published === false ? 0 : 1,
        Number(b.sort_order ?? 10)
      );
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/api/admin/subjects/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Subject not found' });
    return;
  }
  db.prepare(`
    UPDATE subjects SET
      code = ?, name = ?, short_description = ?, course_type = ?, credits = ?,
      cie_marks = ?, ese_marks = ?, content_focus = ?, syllabus_summary = ?,
      is_published = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    String(b.code ?? existing.code),
    String(b.name ?? existing.name),
    String(b.short_description ?? existing.short_description),
    String(b.course_type ?? existing.course_type),
    Number(b.credits ?? existing.credits),
    Number(b.cie_marks ?? existing.cie_marks),
    Number(b.ese_marks ?? existing.ese_marks),
    String(b.content_focus ?? existing.content_focus),
    String(b.syllabus_summary ?? existing.syllabus_summary),
    b.is_published === undefined ? Number(existing.is_published) : b.is_published ? 1 : 0,
    id
  );
  res.json({ ok: true });
});

app.delete('/api/admin/subjects/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM subjects WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Modules CRUD
app.post('/api/admin/modules', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.subject_id || !b.module_number || !b.title) {
    res.status(400).json({ error: 'subject_id, module_number, and title are required.' });
    return;
  }
  const db = getDb();
  try {
    const r = db
      .prepare(`
        INSERT INTO modules (subject_id, module_number, title, description, syllabus_text, estimated_hours, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        Number(b.subject_id),
        Number(b.module_number),
        String(b.title).trim(),
        b.description || '',
        b.syllabus_text || b.description || '',
        Number(b.estimated_hours ?? 10),
        b.is_published === false ? 0 : 1
      );
    res.status(201).json({ id: Number(r.lastInsertRowid) });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/api/admin/modules/:id', requireAdmin, (req, res) => {
  getDb().prepare('DELETE FROM modules WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Topics CRUD
app.post('/api/admin/topics', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.subject_id || !b.module_id || !b.title) {
    res.status(400).json({ error: 'subject_id, module_id, and title are required.' });
    return;
  }
  const slug =
    b.slug ||
    String(b.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const r = getDb()
    .prepare(`
      INSERT INTO topics (subject_id, module_id, title, slug, summary, importance, content_type, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      Number(b.subject_id),
      Number(b.module_id),
      String(b.title).trim(),
      slug,
      b.summary || '',
      b.importance || 'important',
      b.content_type || 'theory',
      Number(b.sort_order ?? 1),
      b.is_published === false ? 0 : 1
    );
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/admin/topics/:id', requireAdmin, (req, res) => {
  getDb().prepare('DELETE FROM topics WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Resources CRUD
app.post('/api/admin/resources', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.subject_id || !b.title || !b.resource_type) {
    res.status(400).json({ error: 'subject_id, title, and resource_type are required.' });
    return;
  }
  const r = getDb()
    .prepare(`
      INSERT INTO resources (
        subject_id, module_id, topic_id, academic_year_id, scheme_id, semester_id,
        title, description, resource_type, source_category, importance, content_format,
        exam_type, exam_year, content_markdown, diagram_key, file_url, file_name, file_size_bytes, mime_type, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      Number(b.subject_id),
      b.module_id ? Number(b.module_id) : null,
      b.topic_id ? Number(b.topic_id) : null,
      b.academic_year_id ? Number(b.academic_year_id) : null,
      b.scheme_id ? Number(b.scheme_id) : null,
      b.semester_id ? Number(b.semester_id) : null,
      String(b.title).trim(),
      b.description || '',
      b.resource_type,
      b.source_category || 'simplified_ai_notes',
      b.importance || 'important',
      b.content_format || (b.file_url ? 'pdf' : 'markdown'),
      b.exam_type || null,
      b.exam_year || null,
      b.content_markdown || null,
      b.diagram_key || null,
      b.file_url || null,
      b.file_name || null,
      b.file_size_bytes ? Number(b.file_size_bytes) : null,
      b.mime_type || null,
      b.is_published === false ? 0 : 1
    );
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.patch('/api/admin/resources/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  const b = req.body || {};
  db.prepare(`
    UPDATE resources SET
      title = ?, description = ?, importance = ?, is_published = ?, content_markdown = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    String(b.title ?? existing.title),
    String(b.description ?? existing.description),
    String(b.importance ?? existing.importance),
    b.is_published === undefined ? Number(existing.is_published) : b.is_published ? 1 : 0,
    b.content_markdown === undefined ? (existing.content_markdown as string | null) : (b.content_markdown as string | null),
    id
  );
  res.json({ ok: true });
});

app.delete('/api/admin/resources/:id', requireAdmin, (req, res) => {
  getDb().prepare('DELETE FROM resources WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Questions & Answers CRUD
app.post('/api/admin/questions', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.subject_id || !b.question_text || !b.question_type) {
    res.status(400).json({ error: 'subject_id, question_text, and question_type are required.' });
    return;
  }
  const db = getDb();
  const hasAnswer = Boolean(b.short_answer && String(b.short_answer).trim());
  const qRes = db
    .prepare(`
      INSERT INTO questions (
        subject_id, module_id, topic_id, question_text, question_type, marks,
        difficulty, importance, source_label, source_category, exam_year,
        is_solved, is_important, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      Number(b.subject_id),
      b.module_id ? Number(b.module_id) : null,
      b.topic_id ? Number(b.topic_id) : null,
      String(b.question_text).trim(),
      b.question_type,
      b.marks ? Number(b.marks) : null,
      b.difficulty || 'medium',
      b.importance || 'important',
      b.source_label || 'Practice Bank',
      b.source_category || 'practice_material',
      b.exam_year || null,
      hasAnswer ? 1 : 0,
      b.is_important ? 1 : 0,
      b.is_published === false ? 0 : 1
    );
  const questionId = Number(qRes.lastInsertRowid);
  if (hasAnswer) {
    db.prepare(`
      INSERT INTO answers (question_id, short_answer, detailed_explanation, code_snippet, code_language, formula_text, expected_marks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      questionId,
      String(b.short_answer).trim(),
      b.detailed_explanation || null,
      b.code_snippet || null,
      b.code_language || 'java',
      b.formula_text || null,
      b.marks ? Number(b.marks) : null
    );
  }
  res.status(201).json({ id: questionId });
});

app.patch('/api/admin/questions/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Question not found' });
    return;
  }
  const b = req.body || {};
  db.prepare(`
    UPDATE questions SET is_published = ?, is_important = ?, importance = ? WHERE id = ?
  `).run(
    b.is_published === undefined ? Number(existing.is_published) : b.is_published ? 1 : 0,
    b.is_important === undefined ? Number(existing.is_important) : b.is_important ? 1 : 0,
    String(b.importance ?? existing.importance),
    id
  );
  res.json({ ok: true });
});

app.delete('/api/admin/questions/:id', requireAdmin, (req, res) => {
  getDb().prepare('DELETE FROM questions WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Programs CRUD
app.post('/api/admin/programs', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.subject_id || !b.title || !b.code) {
    res.status(400).json({ error: 'subject_id, title, and code are required.' });
    return;
  }
  const r = getDb()
    .prepare(`
      INSERT INTO programs (subject_id, module_id, topic_id, title, description, problem_statement, language, code, sample_input, sample_output, explanation, importance, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      Number(b.subject_id),
      b.module_id ? Number(b.module_id) : null,
      b.topic_id ? Number(b.topic_id) : null,
      String(b.title).trim(),
      b.description || '',
      b.problem_statement || b.description || '',
      b.language || 'java',
      b.code,
      b.sample_input || null,
      b.sample_output || null,
      b.explanation || null,
      b.importance || 'important',
      b.is_published === false ? 0 : 1
    );
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/admin/programs/:id', requireAdmin, (req, res) => {
  getDb().prepare('DELETE FROM programs WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Quick Revision CRUD
app.post('/api/admin/revision', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.subject_id || !b.title || !b.content_markdown || !b.category) {
    res.status(400).json({ error: 'subject_id, category, title, and content_markdown are required.' });
    return;
  }
  const r = getDb()
    .prepare(`
      INSERT INTO revision_items (subject_id, module_id, topic_id, category, title, content_markdown, code_snippet, importance, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      Number(b.subject_id),
      b.module_id ? Number(b.module_id) : null,
      b.topic_id ? Number(b.topic_id) : null,
      b.category,
      String(b.title).trim(),
      b.content_markdown,
      b.code_snippet || null,
      b.importance || 'must_study',
      Number(b.sort_order ?? 10),
      b.is_published === false ? 0 : 1
    );
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/admin/revision/:id', requireAdmin, (req, res) => {
  getDb().prepare('DELETE FROM revision_items WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Bulk Import (JSON array for questions, resources, or topics)
app.post('/api/admin/bulk-import', requireAdmin, (req, res) => {
  const { entityType, subjectId, moduleId, items } = req.body || {};
  if (!entityType || !subjectId || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'entityType, subjectId, and non-empty items array are required.' });
    return;
  }

  const db = getDb();
  let inserted = 0;

  try {
    db.exec('BEGIN');
    for (const item of items) {
      if (entityType === 'questions') {
        const hasAns = Boolean(item.short_answer);
        const qRes = db
          .prepare(`
            INSERT INTO questions (subject_id, module_id, question_text, question_type, marks, difficulty, importance, source_label, is_solved, is_important, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `)
          .run(
            Number(subjectId),
            item.module_id ? Number(item.module_id) : moduleId ? Number(moduleId) : null,
            String(item.question_text || item.question || '').trim(),
            item.question_type || 'short_answer',
            item.marks ? Number(item.marks) : null,
            item.difficulty || 'medium',
            item.importance || 'important',
            item.source_label || 'Bulk Import',
            hasAns ? 1 : 0,
            item.is_important ? 1 : 0
          );
        if (hasAns) {
          db.prepare(
            'INSERT INTO answers (question_id, short_answer, detailed_explanation, code_snippet, expected_marks) VALUES (?, ?, ?, ?, ?)'
          ).run(
            Number(qRes.lastInsertRowid),
            String(item.short_answer),
            item.detailed_explanation || null,
            item.code_snippet || null,
            item.marks ? Number(item.marks) : null
          );
        }
        inserted++;
      } else if (entityType === 'topics') {
        const title = String(item.title || '').trim();
        if (!title || !(item.module_id || moduleId)) continue;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        db.prepare(
          'INSERT INTO topics (subject_id, module_id, title, slug, summary, importance, content_type, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
        ).run(
          Number(subjectId),
          Number(item.module_id || moduleId),
          title,
          slug,
          item.summary || '',
          item.importance || 'important',
          item.content_type || 'theory',
          Number(item.sort_order ?? inserted + 1)
        );
        inserted++;
      } else if (entityType === 'resources') {
        db.prepare(`
          INSERT INTO resources (subject_id, module_id, title, description, resource_type, source_category, importance, content_format, content_markdown, is_published)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'markdown', ?, 1)
        `).run(
          Number(subjectId),
          item.module_id ? Number(item.module_id) : moduleId ? Number(moduleId) : null,
          String(item.title || '').trim(),
          item.description || '',
          item.resource_type || 'exam_notes',
          item.source_category || 'simplified_ai_notes',
          item.importance || 'important',
          item.content_markdown || ''
        );
        inserted++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  res.json({ ok: true, inserted });
});

// Serve built Vite frontend in production if dist/ exists
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

async function start() {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`KTU S3 Study Hub API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
