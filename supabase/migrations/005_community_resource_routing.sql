-- Extend community approval so admins can edit metadata and route a file to any verified subject/module.
-- Existing published resources are updated in place when an admin edits an approved submission.

DROP FUNCTION IF EXISTS public.approve_community_submission(UUID,BIGINT,BIGINT,TEXT);
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
) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 submission public.community_submissions%ROWTYPE;
 target public.subjects%ROWTYPE;
 new_resource_id BIGINT;
 resource_kind TEXT;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO submission FROM public.community_submissions WHERE id=p_submission_id FOR UPDATE;
 IF NOT FOUND OR submission.status <> 'pending' THEN RAISE EXCEPTION 'Submission is missing or already reviewed'; END IF;
 IF p_category NOT IN ('Study Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources') THEN RAISE EXCEPTION 'Choose a valid resource category'; END IF;
 IF length(trim(COALESCE(p_title,''))) NOT BETWEEN 1 AND 180 THEN RAISE EXCEPTION 'Resource title must be between 1 and 180 characters'; END IF;
 SELECT * INTO target FROM public.subjects WHERE id=p_subject_id AND is_published FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose a published destination subject'; END IF;
 IF p_module_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.modules WHERE id=p_module_id AND subject_id=p_subject_id AND is_published) THEN RAISE EXCEPTION 'Module does not belong to the selected subject'; END IF;
 IF p_topic_id IS NOT NULL AND (p_module_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.topics WHERE id=p_topic_id AND subject_id=p_subject_id AND module_id=p_module_id AND is_published)) THEN RAISE EXCEPTION 'Choose a topic in the selected subject/module'; END IF;
 IF p_published_file_path IS NULL OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='study-resources' AND name=p_published_file_path) THEN RAISE EXCEPTION 'Published resource file is missing'; END IF;
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
 INSERT INTO public.resources(subject_id,module_id,topic_id,academic_year_id,scheme_id,semester_id,title,description,resource_type,source_category,importance,content_format,file_path,file_name,file_size_bytes,mime_type,category,is_published)
 VALUES(p_subject_id,p_module_id,p_topic_id,target.academic_year_id,target.scheme_id,target.semester_id,trim(p_title),COALESCE(p_description,''),resource_kind,'original_student_notes','important',CASE WHEN submission.mime_type='application/pdf' THEN 'pdf' ELSE 'mixed' END,p_published_file_path,submission.original_file_name,submission.file_size_bytes,submission.mime_type,p_category,true)
 RETURNING id INTO new_resource_id;
 UPDATE public.community_submissions SET
  branch_id=target.branch_id, semester_id=target.semester_id, subject_id=target.id, subject_name=target.name, subject_code=target.code,
  module_label=CASE WHEN p_module_id IS NULL THEN NULL ELSE (SELECT 'Module '||module_number||': '||title FROM public.modules WHERE id=p_module_id) END,
  topic_label=CASE WHEN p_topic_id IS NULL THEN NULL ELSE (SELECT title FROM public.topics WHERE id=p_topic_id) END,
  title=trim(p_title),description=COALESCE(p_description,''),category=p_category,source_info=NULLIF(trim(COALESCE(p_source_info,'')),''),
  status='approved',reviewed_by=auth.uid(),reviewed_at=NOW(),published_resource_id=new_resource_id
 WHERE id=p_submission_id;
 UPDATE public.admin_notifications SET read_at=COALESCE(read_at,NOW()) WHERE submission_id=p_submission_id;
 RETURN new_resource_id;
END; $$;
REVOKE ALL ON FUNCTION public.approve_community_submission(UUID,BIGINT,BIGINT,BIGINT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_community_submission(UUID,BIGINT,BIGINT,BIGINT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- Keep the original RPC signature working during a frontend rollout.
CREATE OR REPLACE FUNCTION public.approve_community_submission(
 p_submission_id UUID, p_subject_id BIGINT, p_module_id BIGINT DEFAULT NULL, p_published_file_path TEXT DEFAULT NULL
) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE submission public.community_submissions%ROWTYPE;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO submission FROM public.community_submissions WHERE id=p_submission_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Submission is missing'; END IF;
 RETURN public.approve_community_submission(p_submission_id,p_subject_id,p_module_id,NULL,p_published_file_path,submission.title,submission.description,submission.category,submission.source_info);
END; $$;
REVOKE ALL ON FUNCTION public.approve_community_submission(UUID,BIGINT,BIGINT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_community_submission(UUID,BIGINT,BIGINT,TEXT) TO authenticated;

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
) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 submission public.community_submissions%ROWTYPE;
 target public.subjects%ROWTYPE;
 resource_kind TEXT;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO submission FROM public.community_submissions WHERE id=p_submission_id FOR UPDATE;
 IF NOT FOUND OR submission.status <> 'approved' OR submission.published_resource_id IS NULL THEN RAISE EXCEPTION 'Approved submission is missing'; END IF;
 IF p_category NOT IN ('Study Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources') THEN RAISE EXCEPTION 'Choose a valid resource category'; END IF;
 IF length(trim(COALESCE(p_title,''))) NOT BETWEEN 1 AND 180 THEN RAISE EXCEPTION 'Resource title must be between 1 and 180 characters'; END IF;
 SELECT * INTO target FROM public.subjects WHERE id=p_subject_id AND is_published FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose a published destination subject'; END IF;
 IF p_module_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.modules WHERE id=p_module_id AND subject_id=p_subject_id AND is_published) THEN RAISE EXCEPTION 'Module does not belong to the selected subject'; END IF;
 IF p_topic_id IS NOT NULL AND (p_module_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.topics WHERE id=p_topic_id AND subject_id=p_subject_id AND module_id=p_module_id AND is_published)) THEN RAISE EXCEPTION 'Choose a topic in the selected subject/module'; END IF;
 IF p_published_file_path IS NOT NULL AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='study-resources' AND name=p_published_file_path) THEN RAISE EXCEPTION 'Replacement resource file is missing'; END IF;
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
 UPDATE public.resources SET subject_id=p_subject_id,module_id=p_module_id,topic_id=p_topic_id,academic_year_id=target.academic_year_id,scheme_id=target.scheme_id,semester_id=target.semester_id,
  title=trim(p_title),description=COALESCE(p_description,''),resource_type=resource_kind,source_category='original_student_notes',category=p_category,
  file_path=COALESCE(p_published_file_path,file_path),updated_at=NOW()
 WHERE id=submission.published_resource_id;
 UPDATE public.community_submissions SET branch_id=target.branch_id,semester_id=target.semester_id,subject_id=target.id,subject_name=target.name,subject_code=target.code,
  module_label=CASE WHEN p_module_id IS NULL THEN NULL ELSE (SELECT 'Module '||module_number||': '||title FROM public.modules WHERE id=p_module_id) END,
  topic_label=CASE WHEN p_topic_id IS NULL THEN NULL ELSE (SELECT title FROM public.topics WHERE id=p_topic_id) END,
  title=trim(p_title),description=COALESCE(p_description,''),category=p_category,source_info=NULLIF(trim(COALESCE(p_source_info,'')),'')
 WHERE id=p_submission_id;
 RETURN submission.published_resource_id;
END; $$;
REVOKE ALL ON FUNCTION public.edit_approved_community_submission(UUID,BIGINT,BIGINT,BIGINT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edit_approved_community_submission(UUID,BIGINT,BIGINT,BIGINT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
