ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS category TEXT;
UPDATE public.resources SET file_path = regexp_replace(file_url, '^.*/storage/v1/object/(?:public|sign)/study-resources/', '')
WHERE file_path IS NULL AND file_url LIKE '%/storage/v1/object/%/study-resources/%';

CREATE TABLE IF NOT EXISTS public.subject_syllabi (
  id BIGSERIAL PRIMARY KEY,
  subject_id BIGINT NOT NULL UNIQUE REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Official Syllabus',
  description TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.subject_syllabi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published syllabi" ON public.subject_syllabi;
CREATE POLICY "Public read published syllabi" ON public.subject_syllabi FOR SELECT USING (
  (is_published AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = subject_id AND s.is_published)) OR public.is_admin()
);
DROP POLICY IF EXISTS "Admin manage syllabi" ON public.subject_syllabi;
CREATE POLICY "Admin manage syllabi" ON public.subject_syllabi FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.subject_syllabi TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subject_syllabi TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.subject_syllabi_id_seq TO authenticated;

-- Private bucket access is granted only when a published resource/syllabus references the object.
UPDATE storage.buckets SET public = FALSE, file_size_limit = 26214400,
  allowed_mime_types = ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp','text/plain','text/markdown']
WHERE id = 'study-resources';
DROP POLICY IF EXISTS "Public read study-resources" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload study-resources" ON storage.objects;
DROP POLICY IF EXISTS "Admin update study-resources" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete study-resources" ON storage.objects;
DROP POLICY IF EXISTS "Published resources read study-resources" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage study-resources" ON storage.objects;
CREATE POLICY "Published resources read study-resources" ON storage.objects FOR SELECT USING (
  bucket_id = 'study-resources' AND (
    public.is_admin() OR EXISTS (SELECT 1 FROM public.resources r WHERE r.file_path = name AND r.is_published AND EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = r.subject_id AND s.is_published))
    OR EXISTS (SELECT 1 FROM public.subject_syllabi y JOIN public.subjects s ON s.id = y.subject_id WHERE y.file_path = name AND y.is_published AND s.is_published)
  )
);
CREATE POLICY "Admins manage study-resources" ON storage.objects FOR ALL USING (bucket_id = 'study-resources' AND public.is_admin()) WITH CHECK (bucket_id = 'study-resources' AND public.is_admin());
