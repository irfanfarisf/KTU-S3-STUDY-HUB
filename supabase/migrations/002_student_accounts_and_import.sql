-- User-owned cloud bookmarks and study progress.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.student_records (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_key TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('bookmark', 'topic_complete', 'question_practiced')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, record_key)
);

ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students manage own records" ON public.student_records;
CREATE POLICY "Students manage own records" ON public.student_records
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_records TO authenticated;
GRANT SELECT ON public.universities, public.schemes, public.academic_years, public.branches, public.semesters,
  public.subjects, public.modules, public.topics, public.resources, public.questions, public.answers,
  public.programs, public.revision_items TO anon, authenticated;
GRANT SELECT ON public.admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.universities, public.schemes, public.academic_years, public.branches,
  public.semesters, public.subjects, public.modules, public.topics, public.resources, public.questions,
  public.answers, public.programs, public.revision_items TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure published children of unpublished subjects never appear in public searches.
DROP POLICY IF EXISTS "Public read published modules" ON public.modules;
CREATE POLICY "Public read published modules" ON public.modules FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
DROP POLICY IF EXISTS "Public read published topics" ON public.topics;
CREATE POLICY "Public read published topics" ON public.topics FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
DROP POLICY IF EXISTS "Public read published resources" ON public.resources;
CREATE POLICY "Public read published resources" ON public.resources FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
DROP POLICY IF EXISTS "Public read published questions" ON public.questions;
CREATE POLICY "Public read published questions" ON public.questions FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
DROP POLICY IF EXISTS "Public read answers" ON public.answers;
CREATE POLICY "Public read answers" ON public.answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.questions q JOIN public.subjects s ON s.id = q.subject_id
    WHERE q.id = question_id AND ((q.is_published = true AND s.is_published = true) OR public.is_admin())
  )
);
DROP POLICY IF EXISTS "Public read published programs" ON public.programs;
CREATE POLICY "Public read published programs" ON public.programs FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);
DROP POLICY IF EXISTS "Public read published revision" ON public.revision_items;
CREATE POLICY "Public read published revision" ON public.revision_items FOR SELECT USING (
  (is_published = true AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published = true)) OR public.is_admin()
);

-- Permit the one-time local SQLite import tool to restore BIGSERIAL sequences.
CREATE OR REPLACE FUNCTION public.sync_imported_sequences()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'universities', 'schemes', 'academic_years', 'branches', 'semesters', 'subjects',
    'modules', 'topics', 'resources', 'questions', 'answers', 'programs', 'revision_items'
  ] LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM public.%I',
      'public.' || table_name, 'id', table_name
    );
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_imported_sequences() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_imported_sequences() TO service_role;
