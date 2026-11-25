-- Fix cross-browser/device resource access by fixing the storage.objects RLS name-shadowing bug,
-- adding explicit storage_bucket references, safely repairing legacy references, and adding an admin storage audit RPC.
-- Apply after migrations 001-006.

-- 1. Store explicit storage bucket names alongside object paths
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT;

ALTER TABLE public.subject_syllabi
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'study-resources';

ALTER TABLE public.community_submissions
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'pending-submissions';

-- 2. Non-destructive repair of legacy storage references (never deletes records or files)
-- Extract bucket and object path if a Supabase Storage URL was ever stored in file_url
UPDATE public.resources
SET
  storage_bucket = COALESCE(
    NULLIF(trim(storage_bucket), ''),
    substring(file_url FROM '/storage/v1/object/(?:public|sign)/([^/]+)/')
  ),
  file_path = COALESCE(
    NULLIF(trim(file_path), ''),
    split_part(
      regexp_replace(file_url, '^.*/storage/v1/object/(?:public|sign)/[^/]+/', ''),
      '?',
      1
    )
  ),
  file_url = NULL,
  updated_at = NOW()
WHERE file_url ~ '/storage/v1/object/(?:public|sign)/[^/]+/.+'
  AND (file_path IS NULL OR length(trim(file_path)) = 0);

-- Normalize accidental leading slashes in file_path without modifying valid nested prefixes
UPDATE public.resources
SET file_path = ltrim(file_path, '/'),
    updated_at = NOW()
WHERE file_path LIKE '/%';

UPDATE public.subject_syllabi
SET file_path = ltrim(file_path, '/'),
    updated_at = NOW()
WHERE file_path LIKE '/%';

-- Backfill storage_bucket on existing file-backed rows
UPDATE public.resources
SET storage_bucket = 'study-resources'
WHERE file_path IS NOT NULL
  AND length(trim(file_path)) > 0
  AND (storage_bucket IS NULL OR length(trim(storage_bucket)) = 0);

UPDATE public.subject_syllabi
SET storage_bucket = 'study-resources'
WHERE storage_bucket IS NULL OR length(trim(storage_bucket)) = 0;

UPDATE public.community_submissions
SET storage_bucket = 'pending-submissions'
WHERE storage_bucket IS NULL OR length(trim(storage_bucket)) = 0;

-- 3. Fix storage.objects SELECT RLS policy
-- Root cause: in migration 006 (and subject_syllabi in 003), joining public.subjects s inside EXISTS(...)
-- caused unqualified `name` in `r.file_path = name` / `y.file_path = name` to resolve to `s.name`
-- instead of `storage.objects.name`. That caused ALL published files to return "Object not found" for
-- non-admin visitors, while succeeding in the admin's own session via `public.is_admin()`.
CREATE OR REPLACE FUNCTION public.is_published_study_storage_object(
  p_bucket_id TEXT,
  p_object_name TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resources r
    JOIN public.subjects s ON s.id = r.subject_id
    WHERE COALESCE(NULLIF(trim(r.storage_bucket), ''), 'study-resources') = p_bucket_id
      AND r.file_path = p_object_name
      AND r.is_published = TRUE
      AND r.deleted_at IS NULL
      AND s.is_published = TRUE
  )
  OR EXISTS (
    SELECT 1
    FROM public.subject_syllabi y
    JOIN public.subjects s ON s.id = y.subject_id
    WHERE COALESCE(NULLIF(trim(y.storage_bucket), ''), 'study-resources') = p_bucket_id
      AND y.file_path = p_object_name
      AND y.is_published = TRUE
      AND s.is_published = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_published_study_storage_object(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_study_storage_object(TEXT, TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Published resources read study-resources" ON storage.objects;
CREATE POLICY "Published resources read study-resources" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'study-resources' AND (
      public.is_admin()
      OR public.is_published_study_storage_object(bucket_id, name)
    )
  );

-- Ensure study-resources remains private (so unpublished/trashed files stay protected) while
-- supporting all approved academic formats.
UPDATE storage.buckets
SET public = FALSE,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
      'text/markdown'
    ]
WHERE id = 'study-resources';

-- 4. Update community approval RPCs to persist storage_bucket = 'study-resources'
CREATE OR REPLACE FUNCTION public.approve_community_submission(
  p_submission_id UUID,
  p_subject_id BIGINT,
  p_module_id BIGINT,
  p_topic_id BIGINT,
  p_published_file_path TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_source_info TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submission public.community_submissions%ROWTYPE;
  target public.subjects%ROWTYPE;
  new_resource_id BIGINT;
  resource_kind TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO submission FROM public.community_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND OR submission.status <> 'pending' THEN
    RAISE EXCEPTION 'Submission is missing or already reviewed';
  END IF;
  IF p_category NOT IN ('Study Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources') THEN
    RAISE EXCEPTION 'Choose a valid resource category';
  END IF;
  IF length(trim(COALESCE(p_title, ''))) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Resource title must be between 1 and 180 characters';
  END IF;
  SELECT * INTO target FROM public.subjects WHERE id = p_subject_id AND is_published FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a published destination subject'; END IF;
  IF p_module_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.modules WHERE id = p_module_id AND subject_id = p_subject_id AND is_published
  ) THEN
    RAISE EXCEPTION 'Module does not belong to the selected subject';
  END IF;
  IF p_topic_id IS NOT NULL AND (p_module_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.topics WHERE id = p_topic_id AND subject_id = p_subject_id AND module_id = p_module_id AND is_published
  )) THEN
    RAISE EXCEPTION 'Choose a topic in the selected subject/module';
  END IF;
  IF p_published_file_path IS NULL OR NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'study-resources' AND name = p_published_file_path
  ) THEN
    RAISE EXCEPTION 'Published resource file is missing from study-resources bucket';
  END IF;

  resource_kind := CASE p_category
    WHEN 'Handwritten Notes' THEN 'handwritten_notes'
    WHEN 'Previous Year Question Papers' THEN 'pyq'
    WHEN 'Model Question Papers' THEN 'model_paper'
    WHEN 'Solved Question Papers' THEN 'solved_paper'
    WHEN 'Reference Materials' THEN 'reference_notes'
    WHEN 'Question Banks' THEN 'exam_notes'
    WHEN 'Important Questions' THEN 'exam_notes'
    WHEN 'Assignments' THEN 'exam_notes'
    WHEN 'Other Resources' THEN 'original_notes'
    ELSE 'original_notes'
  END;

  INSERT INTO public.resources(
    subject_id, module_id, topic_id, academic_year_id, scheme_id, semester_id,
    title, description, resource_type, source_category, importance, content_format,
    storage_bucket, file_path, file_name, file_size_bytes, mime_type, category, is_published
  )
  VALUES(
    p_subject_id, p_module_id, p_topic_id, target.academic_year_id, target.scheme_id, target.semester_id,
    trim(p_title), COALESCE(p_description, ''), resource_kind, 'original_student_notes', 'important',
    CASE WHEN submission.mime_type = 'application/pdf' THEN 'pdf' ELSE 'mixed' END,
    'study-resources', p_published_file_path, submission.original_file_name,
    submission.file_size_bytes, submission.mime_type, p_category, TRUE
  )
  RETURNING id INTO new_resource_id;

  UPDATE public.community_submissions SET
    branch_id = target.branch_id,
    semester_id = target.semester_id,
    subject_id = target.id,
    subject_name = target.name,
    subject_code = target.code,
    module_label = CASE WHEN p_module_id IS NULL THEN NULL ELSE (SELECT 'Module ' || module_number || ': ' || title FROM public.modules WHERE id = p_module_id) END,
    topic_label = CASE WHEN p_topic_id IS NULL THEN NULL ELSE (SELECT title FROM public.topics WHERE id = p_topic_id) END,
    title = trim(p_title),
    description = COALESCE(p_description, ''),
    category = p_category,
    source_info = NULLIF(trim(COALESCE(p_source_info, '')), ''),
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    published_resource_id = new_resource_id
  WHERE id = p_submission_id;

  UPDATE public.admin_notifications SET read_at = COALESCE(read_at, NOW()) WHERE submission_id = p_submission_id;
  RETURN new_resource_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.edit_approved_community_submission(
  p_submission_id UUID,
  p_subject_id BIGINT,
  p_module_id BIGINT,
  p_topic_id BIGINT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_source_info TEXT,
  p_published_file_path TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submission public.community_submissions%ROWTYPE;
  target public.subjects%ROWTYPE;
  resource_kind TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO submission FROM public.community_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND OR submission.status <> 'approved' OR submission.published_resource_id IS NULL THEN
    RAISE EXCEPTION 'Approved submission is missing';
  END IF;
  IF p_category NOT IN ('Study Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources') THEN
    RAISE EXCEPTION 'Choose a valid resource category';
  END IF;
  IF length(trim(COALESCE(p_title, ''))) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Resource title must be between 1 and 180 characters';
  END IF;
  SELECT * INTO target FROM public.subjects WHERE id = p_subject_id AND is_published FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose a published destination subject'; END IF;
  IF p_module_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.modules WHERE id = p_module_id AND subject_id = p_subject_id AND is_published
  ) THEN
    RAISE EXCEPTION 'Module does not belong to the selected subject';
  END IF;
  IF p_topic_id IS NOT NULL AND (p_module_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.topics WHERE id = p_topic_id AND subject_id = p_subject_id AND module_id = p_module_id AND is_published
  )) THEN
    RAISE EXCEPTION 'Choose a topic in the selected subject/module';
  END IF;
  IF p_published_file_path IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'study-resources' AND name = p_published_file_path
  ) THEN
    RAISE EXCEPTION 'Replacement resource file is missing from study-resources bucket';
  END IF;

  resource_kind := CASE p_category
    WHEN 'Handwritten Notes' THEN 'handwritten_notes'
    WHEN 'Previous Year Question Papers' THEN 'pyq'
    WHEN 'Model Question Papers' THEN 'model_paper'
    WHEN 'Solved Question Papers' THEN 'solved_paper'
    WHEN 'Reference Materials' THEN 'reference_notes'
    WHEN 'Question Banks' THEN 'exam_notes'
    WHEN 'Important Questions' THEN 'exam_notes'
    WHEN 'Assignments' THEN 'exam_notes'
    WHEN 'Other Resources' THEN 'original_notes'
    ELSE 'original_notes'
  END;

  UPDATE public.resources SET
    subject_id = p_subject_id,
    module_id = p_module_id,
    topic_id = p_topic_id,
    academic_year_id = target.academic_year_id,
    scheme_id = target.scheme_id,
    semester_id = target.semester_id,
    title = trim(p_title),
    description = COALESCE(p_description, ''),
    resource_type = resource_kind,
    source_category = 'original_student_notes',
    category = p_category,
    storage_bucket = CASE WHEN p_published_file_path IS NOT NULL THEN 'study-resources' ELSE COALESCE(NULLIF(trim(storage_bucket), ''), 'study-resources') END,
    file_path = COALESCE(p_published_file_path, file_path),
    updated_at = NOW()
  WHERE id = submission.published_resource_id;

  UPDATE public.community_submissions SET
    branch_id = target.branch_id,
    semester_id = target.semester_id,
    subject_id = target.id,
    subject_name = target.name,
    subject_code = target.code,
    module_label = CASE WHEN p_module_id IS NULL THEN NULL ELSE (SELECT 'Module ' || module_number || ': ' || title FROM public.modules WHERE id = p_module_id) END,
    topic_label = CASE WHEN p_topic_id IS NULL THEN NULL ELSE (SELECT title FROM public.topics WHERE id = p_topic_id) END,
    title = trim(p_title),
    description = COALESCE(p_description, ''),
    category = p_category,
    source_info = NULLIF(trim(COALESCE(p_source_info, '')), '')
  WHERE id = p_submission_id;

  RETURN submission.published_resource_id;
END;
$$;

-- 5. Admin-only storage audit RPC (inspects storage.objects directly without exposing service-role keys)
CREATE OR REPLACE FUNCTION public.audit_storage_references()
RETURNS TABLE (
  source_table TEXT,
  record_id TEXT,
  subject_code TEXT,
  title TEXT,
  is_published BOOLEAN,
  deleted_at TIMESTAMPTZ,
  storage_bucket TEXT,
  file_path TEXT,
  file_url TEXT,
  expected_file_name TEXT,
  expected_mime_type TEXT,
  expected_size_bytes BIGINT,
  object_exists BOOLEAN,
  actual_mime_type TEXT,
  actual_size_bytes BIGINT,
  issue TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    'resources'::TEXT AS source_table,
    r.id::TEXT AS record_id,
    s.code AS subject_code,
    r.title,
    (r.is_published AND s.is_published) AS is_published,
    r.deleted_at,
    COALESCE(NULLIF(trim(r.storage_bucket), ''), 'study-resources') AS storage_bucket,
    r.file_path,
    r.file_url,
    r.file_name AS expected_file_name,
    r.mime_type AS expected_mime_type,
    r.file_size_bytes AS expected_size_bytes,
    (o.id IS NOT NULL) AS object_exists,
    (o.metadata->>'mimetype')::TEXT AS actual_mime_type,
    NULLIF(o.metadata->>'size', '')::BIGINT AS actual_size_bytes,
    CASE
      WHEN r.file_url IS NOT NULL AND (
        r.file_url LIKE 'blob:%'
        OR r.file_url LIKE '/api/files/%'
        OR r.file_url LIKE 'file://%'
        OR r.file_url ~ '^[A-Za-z]:[\\/]'
        OR r.file_url LIKE '%/storage/v1/object/sign/%'
      ) THEN 'invalid_url_reference'
      WHEN r.file_path IS NULL OR length(trim(r.file_path)) = 0 THEN 'missing_path'
      WHEN o.id IS NULL THEN 'missing_object'
      WHEN r.file_size_bytes IS NOT NULL AND NULLIF(o.metadata->>'size', '') IS NOT NULL AND NULLIF(o.metadata->>'size', '')::BIGINT <> r.file_size_bytes THEN 'size_mismatch'
      WHEN r.mime_type IS NOT NULL AND NULLIF(o.metadata->>'mimetype', '') IS NOT NULL AND lower(o.metadata->>'mimetype') <> lower(r.mime_type) THEN 'mime_mismatch'
      ELSE 'ok'
    END AS issue
  FROM public.resources r
  JOIN public.subjects s ON s.id = r.subject_id
  LEFT JOIN storage.objects o
    ON o.bucket_id = COALESCE(NULLIF(trim(r.storage_bucket), ''), 'study-resources')
   AND o.name = r.file_path
  WHERE r.file_path IS NOT NULL OR r.file_url IS NOT NULL

  UNION ALL

  SELECT
    'subject_syllabi'::TEXT AS source_table,
    y.id::TEXT AS record_id,
    s.code AS subject_code,
    y.title,
    (y.is_published AND s.is_published) AS is_published,
    NULL::TIMESTAMPTZ AS deleted_at,
    COALESCE(NULLIF(trim(y.storage_bucket), ''), 'study-resources') AS storage_bucket,
    y.file_path,
    NULL::TEXT AS file_url,
    y.file_name AS expected_file_name,
    y.mime_type AS expected_mime_type,
    y.file_size_bytes AS expected_size_bytes,
    (o.id IS NOT NULL) AS object_exists,
    (o.metadata->>'mimetype')::TEXT AS actual_mime_type,
    NULLIF(o.metadata->>'size', '')::BIGINT AS actual_size_bytes,
    CASE
      WHEN y.file_path IS NULL OR length(trim(y.file_path)) = 0 THEN 'missing_path'
      WHEN o.id IS NULL THEN 'missing_object'
      WHEN y.file_size_bytes IS NOT NULL AND NULLIF(o.metadata->>'size', '') IS NOT NULL AND NULLIF(o.metadata->>'size', '')::BIGINT <> y.file_size_bytes THEN 'size_mismatch'
      ELSE 'ok'
    END AS issue
  FROM public.subject_syllabi y
  JOIN public.subjects s ON s.id = y.subject_id
  LEFT JOIN storage.objects o
    ON o.bucket_id = COALESCE(NULLIF(trim(y.storage_bucket), ''), 'study-resources')
   AND o.name = y.file_path

  UNION ALL

  SELECT
    'community_submissions'::TEXT AS source_table,
    c.id::TEXT AS record_id,
    COALESCE(s.code, c.subject_code, c.subject_name) AS subject_code,
    c.title,
    (c.status = 'approved') AS is_published,
    NULL::TIMESTAMPTZ AS deleted_at,
    COALESCE(NULLIF(trim(c.storage_bucket), ''), 'pending-submissions') AS storage_bucket,
    c.file_path,
    NULL::TEXT AS file_url,
    c.original_file_name AS expected_file_name,
    c.mime_type AS expected_mime_type,
    c.file_size_bytes AS expected_size_bytes,
    (o.id IS NOT NULL) AS object_exists,
    (o.metadata->>'mimetype')::TEXT AS actual_mime_type,
    NULLIF(o.metadata->>'size', '')::BIGINT AS actual_size_bytes,
    CASE
      WHEN c.file_path IS NULL OR length(trim(c.file_path)) = 0 THEN 'missing_path'
      WHEN o.id IS NULL THEN 'missing_object'
      ELSE 'ok'
    END AS issue
  FROM public.community_submissions c
  LEFT JOIN public.subjects s ON s.id = c.subject_id
  LEFT JOIN storage.objects o
    ON o.bucket_id = COALESCE(NULLIF(trim(c.storage_bucket), ''), 'pending-submissions')
   AND o.name = c.file_path;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_storage_references() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_storage_references() TO authenticated;
