-- Resource lifecycle states (unpublish, republish/restore, soft delete/Trash, safe permanent delete)
-- and Community Submissions archive ("Remove from Community") without breaking published resources or files.
-- Apply after migrations 001-005.

-- 1. Extend public.resources with non-destructive lifecycle columns
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS was_published_before_delete BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_resources_lifecycle
  ON public.resources(deleted_at, is_published, subject_id);

-- 2. Extend public.community_submissions with archive-from-community columns
ALTER TABLE public.community_submissions
  ADD COLUMN IF NOT EXISTS archived_from_community_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_from_community_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_community_submissions_archive
  ON public.community_submissions(status, archived_from_community_at, created_at DESC);

-- 3. Tighten student-facing RLS so soft-deleted (Trash) resources and their storage files are never visible to students
DROP POLICY IF EXISTS "Public read published resources" ON public.resources;
CREATE POLICY "Public read published resources" ON public.resources FOR SELECT USING (
  (
    is_published = TRUE
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = subject_id AND s.is_published = TRUE
    )
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Published resources read study-resources" ON storage.objects;
CREATE POLICY "Published resources read study-resources" ON storage.objects FOR SELECT USING (
  bucket_id = 'study-resources' AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.resources r
      JOIN public.subjects s ON s.id = r.subject_id
      WHERE r.file_path = name
        AND r.is_published = TRUE
        AND r.deleted_at IS NULL
        AND s.is_published = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.subject_syllabi y
      JOIN public.subjects s ON s.id = y.subject_id
      WHERE y.file_path = name
        AND y.is_published = TRUE
        AND s.is_published = TRUE
    )
  )
);

-- 4. Unpublish a published resource (keeps DB record, metadata, destination, and storage file)
CREATE OR REPLACE FUNCTION public.unpublish_resource(p_resource_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  res public.resources%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO res FROM public.resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;
  IF res.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot unpublish a resource that is in Trash. Restore it first.';
  END IF;

  UPDATE public.resources
  SET is_published = FALSE,
      unpublished_at = NOW(),
      updated_at = NOW()
  WHERE id = p_resource_id;
END;
$$;
REVOKE ALL ON FUNCTION public.unpublish_resource(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unpublish_resource(BIGINT) TO authenticated;

-- 5. Republish / restore an unpublished resource in place (validates destination, never duplicates)
CREATE OR REPLACE FUNCTION public.republish_resource(
  p_resource_id BIGINT,
  p_subject_id BIGINT DEFAULT NULL,
  p_module_id BIGINT DEFAULT NULL,
  p_topic_id BIGINT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  res public.resources%ROWTYPE;
  target_subject public.subjects%ROWTYPE;
  v_subject_id BIGINT;
  v_module_id BIGINT;
  v_topic_id BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO res FROM public.resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;
  IF res.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Resource is in Trash. Restore it from Trash first.';
  END IF;

  v_subject_id := COALESCE(p_subject_id, res.subject_id);
  SELECT * INTO target_subject FROM public.subjects WHERE id = v_subject_id AND is_published = TRUE FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination subject is missing or unpublished. Please select a valid published subject.';
  END IF;

  IF p_subject_id IS NOT NULL AND p_subject_id <> res.subject_id THEN
    v_module_id := p_module_id;
  ELSE
    v_module_id := COALESCE(p_module_id, res.module_id);
  END IF;

  IF v_module_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.modules WHERE id = v_module_id AND subject_id = v_subject_id AND is_published = TRUE
  ) THEN
    RAISE EXCEPTION 'Destination module is missing or unpublished. Please select a valid module.';
  END IF;

  IF (p_subject_id IS NOT NULL AND p_subject_id <> res.subject_id)
     OR (p_module_id IS NOT NULL AND p_module_id IS DISTINCT FROM res.module_id) THEN
    v_topic_id := p_topic_id;
  ELSE
    v_topic_id := COALESCE(p_topic_id, res.topic_id);
  END IF;

  IF v_topic_id IS NOT NULL AND (v_module_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.topics WHERE id = v_topic_id AND subject_id = v_subject_id AND module_id = v_module_id AND is_published = TRUE
  )) THEN
    RAISE EXCEPTION 'Destination topic is missing or unpublished. Please select a valid topic.';
  END IF;

  UPDATE public.resources
  SET subject_id = v_subject_id,
      module_id = v_module_id,
      topic_id = v_topic_id,
      academic_year_id = target_subject.academic_year_id,
      scheme_id = target_subject.scheme_id,
      semester_id = target_subject.semester_id,
      category = COALESCE(NULLIF(trim(p_category), ''), res.category),
      is_published = TRUE,
      unpublished_at = NULL,
      updated_at = NOW()
  WHERE id = p_resource_id;

  RETURN p_resource_id;
END;
$$;
REVOKE ALL ON FUNCTION public.republish_resource(BIGINT, BIGINT, BIGINT, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.republish_resource(BIGINT, BIGINT, BIGINT, BIGINT, TEXT) TO authenticated;

-- 6. Soft delete a resource (moves to Trash, preserves DB record and storage file)
CREATE OR REPLACE FUNCTION public.soft_delete_resource(p_resource_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  res public.resources%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO res FROM public.resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;
  IF res.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Resource is already in Trash';
  END IF;

  UPDATE public.resources
  SET was_published_before_delete = res.is_published,
      is_published = FALSE,
      deleted_at = NOW(),
      deleted_by = auth.uid(),
      updated_at = NOW()
  WHERE id = p_resource_id;
END;
$$;
REVOKE ALL ON FUNCTION public.soft_delete_resource(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_resource(BIGINT) TO authenticated;

-- 7. Restore a soft-deleted resource from Trash (never duplicates)
CREATE OR REPLACE FUNCTION public.restore_deleted_resource(
  p_resource_id BIGINT,
  p_subject_id BIGINT DEFAULT NULL,
  p_module_id BIGINT DEFAULT NULL,
  p_topic_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  res public.resources%ROWTYPE;
  target_subject public.subjects%ROWTYPE;
  v_should_publish BOOLEAN;
  v_subject_id BIGINT;
  v_module_id BIGINT;
  v_topic_id BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO res FROM public.resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;
  IF res.deleted_at IS NULL THEN
    RAISE EXCEPTION 'Resource is not in Trash';
  END IF;

  v_should_publish := COALESCE(res.was_published_before_delete, TRUE);

  IF v_should_publish THEN
    v_subject_id := COALESCE(p_subject_id, res.subject_id);
    SELECT * INTO target_subject FROM public.subjects WHERE id = v_subject_id AND is_published = TRUE FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Destination subject is missing or unpublished. Please select a valid published subject.';
    END IF;

    IF p_subject_id IS NOT NULL AND p_subject_id <> res.subject_id THEN
      v_module_id := p_module_id;
    ELSE
      v_module_id := COALESCE(p_module_id, res.module_id);
    END IF;

    IF v_module_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.modules WHERE id = v_module_id AND subject_id = v_subject_id AND is_published = TRUE
    ) THEN
      RAISE EXCEPTION 'Destination module is missing or unpublished. Please select a valid module.';
    END IF;

    IF (p_subject_id IS NOT NULL AND p_subject_id <> res.subject_id)
       OR (p_module_id IS NOT NULL AND p_module_id IS DISTINCT FROM res.module_id) THEN
      v_topic_id := p_topic_id;
    ELSE
      v_topic_id := COALESCE(p_topic_id, res.topic_id);
    END IF;

    IF v_topic_id IS NOT NULL AND (v_module_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.topics WHERE id = v_topic_id AND subject_id = v_subject_id AND module_id = v_module_id AND is_published = TRUE
    )) THEN
      RAISE EXCEPTION 'Destination topic is missing or unpublished. Please select a valid topic.';
    END IF;

    UPDATE public.resources
    SET subject_id = v_subject_id,
        module_id = v_module_id,
        topic_id = v_topic_id,
        academic_year_id = target_subject.academic_year_id,
        scheme_id = target_subject.scheme_id,
        semester_id = target_subject.semester_id,
        deleted_at = NULL,
        deleted_by = NULL,
        is_published = TRUE,
        unpublished_at = NULL,
        updated_at = NOW()
    WHERE id = p_resource_id;
  ELSE
    UPDATE public.resources
    SET deleted_at = NULL,
        deleted_by = NULL,
        is_published = FALSE,
        unpublished_at = COALESCE(res.unpublished_at, NOW()),
        updated_at = NOW()
    WHERE id = p_resource_id;
  END IF;

  RETURN p_resource_id;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_deleted_resource(BIGINT, BIGINT, BIGINT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_deleted_resource(BIGINT, BIGINT, BIGINT, BIGINT) TO authenticated;

-- 8. Permanently delete a resource and report whether its storage file is safe to remove
CREATE OR REPLACE FUNCTION public.permanently_delete_resource(p_resource_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  res public.resources%ROWTYPE;
  v_still_referenced BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO res FROM public.resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;

  IF res.file_path IS NOT NULL AND length(trim(res.file_path)) > 0 THEN
    v_still_referenced := EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id <> p_resource_id AND r.file_path = res.file_path
    ) OR EXISTS (
      SELECT 1 FROM public.subject_syllabi y
      WHERE y.file_path = res.file_path
    ) OR EXISTS (
      SELECT 1 FROM public.community_submissions c
      WHERE c.file_path = res.file_path
    );
  END IF;

  DELETE FROM public.resources WHERE id = p_resource_id;

  RETURN jsonb_build_object(
    'deleted_id', p_resource_id,
    'file_path', res.file_path,
    'can_delete_storage_file', (res.file_path IS NOT NULL AND length(trim(res.file_path)) > 0 AND NOT v_still_referenced)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.permanently_delete_resource(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.permanently_delete_resource(BIGINT) TO authenticated;

-- 9. Remove a reviewed submission from the active Community Submissions list (preserves published resource & audit history)
CREATE OR REPLACE FUNCTION public.remove_submission_from_community(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sub public.community_submissions%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO sub FROM public.community_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;
  IF sub.status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Only reviewed (approved or rejected) submissions can be removed from Community Submissions.';
  END IF;

  UPDATE public.community_submissions
  SET archived_from_community_at = NOW(),
      archived_from_community_by = auth.uid()
  WHERE id = p_submission_id;

  UPDATE public.admin_notifications
  SET archived_at = COALESCE(archived_at, NOW()),
      read_at = COALESCE(read_at, NOW())
  WHERE submission_id = p_submission_id;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_submission_from_community(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_submission_from_community(UUID) TO authenticated;

-- 10. Restore an archived submission back into the active Community Submissions list
CREATE OR REPLACE FUNCTION public.restore_submission_to_community(p_submission_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.community_submissions
  SET archived_from_community_at = NULL,
      archived_from_community_by = NULL
  WHERE id = p_submission_id;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_submission_to_community(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_submission_to_community(UUID) TO authenticated;
