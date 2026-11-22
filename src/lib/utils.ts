import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ImportanceLevel, ResourceType, SourceCategory } from '@shared/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const IMPORTANCE_META: Record<
  ImportanceLevel,
  { label: string; className: string }
> = {
  must_study: {
    label: 'Must Study',
    className:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  },
  important: {
    label: 'Important',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  additional: {
    label: 'Additional',
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  exam_notes: 'Exam-Friendly Notes',
  original_notes: 'Original Classroom Notes',
  handwritten_notes: 'Handwritten Notes',
  reference_notes: 'Reference Notes',
  syllabus: 'Official Syllabus',
  pyq: 'Previous Year Paper',
  model_paper: 'Model Paper',
  solved_paper: 'Solved Paper',
  diagram: 'Diagram & Visual',
  quick_revision: 'Quick Revision',
};

export const SOURCE_CATEGORY_LABELS: Record<SourceCategory, string> = {
  official_document: 'Official Syllabus / Doc',
  original_student_notes: 'Student / Study Aid',
  simplified_ai_notes: 'Simplified Exam Notes',
  faculty_notes: 'Classroom Reference',
  practice_material: 'Practice Material',
};
