-- Incremental expansion: private community submissions and admin notifications.
-- Apply after migrations 001-003. This migration does not rewrite existing academic records.

INSERT INTO public.branches (name, code, short_name, description) VALUES
 ('Computer Science and Engineering','CSE','CSE','Computer Science and Engineering'),
 ('Electronics and Communication Engineering','ECE','ECE','Electronics and Communication Engineering'),
 ('Electrical and Electronics Engineering','EEE','EEE','Electrical and Electronics Engineering'),
 ('Mechanical Engineering','ME','ME','Mechanical Engineering'),
 ('Civil Engineering','CE','CE','Civil Engineering'),
 ('Information Technology','IT','IT','Information Technology'),
 ('Chemical Engineering','CHE','CHE','Chemical Engineering'),
 ('Artificial Intelligence and Data Science','AD','AI & DS','Artificial Intelligence and Data Science'),
 ('Computer Science and Engineering (Artificial Intelligence)','CAI','CSE (AI)','Computer Science and Engineering (Artificial Intelligence)'),
 ('Biotechnology','BT','BT','Biotechnology')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.semesters (number,label,code)
SELECT n, 'Semester '||n||' (S'||n||')', 'S'||n FROM generate_series(1,8) n
ON CONFLICT (number) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.community_submissions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 contributor_name TEXT,
 contributor_email TEXT,
 branch_id BIGINT NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
 semester_id BIGINT NOT NULL REFERENCES public.semesters(id) ON DELETE RESTRICT,
 subject_id BIGINT REFERENCES public.subjects(id) ON DELETE SET NULL,
 subject_name TEXT,
 subject_code TEXT,
 module_label TEXT,
 topic_label TEXT,
 title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
 description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 4000),
 category TEXT NOT NULL CHECK (category IN ('Study Notes','Handwritten Notes','Previous Year Question Papers','Model Question Papers','Solved Question Papers','Question Banks','Important Questions','Reference Materials','Assignments','Other Resources')),
 source_info TEXT,
 original_file_name TEXT NOT NULL,
 file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 26214400),
 mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp')),
 file_path TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 internal_review_notes TEXT,
 rejection_reason TEXT,
 reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
 reviewed_at TIMESTAMPTZ,
 published_resource_id BIGINT REFERENCES public.resources(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_submissions_status_created ON public.community_submissions(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_submissions_scope ON public.community_submissions(branch_id,semester_id,category);
ALTER TABLE public.community_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public submit pending resources" ON public.community_submissions;
CREATE POLICY "Public submit pending resources" ON public.community_submissions FOR INSERT TO anon, authenticated
 WITH CHECK (status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND published_resource_id IS NULL AND internal_review_notes IS NULL AND rejection_reason IS NULL);
DROP POLICY IF EXISTS "Admins review submissions" ON public.community_submissions;
CREATE POLICY "Admins review submissions" ON public.community_submissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT INSERT ON public.community_submissions TO anon,authenticated;
GRANT SELECT,UPDATE,DELETE ON public.community_submissions TO authenticated;

CREATE TABLE IF NOT EXISTS public.admin_notifications (
 id BIGSERIAL PRIMARY KEY,
 submission_id UUID NOT NULL UNIQUE REFERENCES public.community_submissions(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 message TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 read_at TIMESTAMPTZ,
 archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_recent ON public.admin_notifications(created_at DESC);
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read notifications" ON public.admin_notifications;
CREATE POLICY "Admins read notifications" ON public.admin_notifications FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins update notifications" ON public.admin_notifications;
CREATE POLICY "Admins update notifications" ON public.admin_notifications FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT,UPDATE ON public.admin_notifications TO authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.admin_notifications_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admin_of_community_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE branch_label TEXT; semester_label TEXT; subject_label TEXT;
BEGIN
 SELECT code INTO branch_label FROM public.branches WHERE id=NEW.branch_id;
 SELECT code INTO semester_label FROM public.semesters WHERE id=NEW.semester_id;
 subject_label := COALESCE(NEW.subject_code,NEW.subject_name,'Subject to verify');
 INSERT INTO public.admin_notifications(submission_id,title,message)
 VALUES (NEW.id,'New resource submission',format('A student submitted %s for %s – %s (%s). Awaiting verification.',NEW.title,branch_label,semester_label,subject_label))
 ON CONFLICT(submission_id) DO NOTHING;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS community_submission_notify_admin ON public.community_submissions;
CREATE TRIGGER community_submission_notify_admin AFTER INSERT ON public.community_submissions
 FOR EACH ROW EXECUTE FUNCTION public.notify_admin_of_community_submission();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('pending-submissions','pending-submissions',false,26214400,ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=26214400,allowed_mime_types=EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Submit pending resource files" ON storage.objects;
CREATE POLICY "Submit pending resource files" ON storage.objects FOR INSERT TO anon,authenticated
 WITH CHECK(bucket_id='pending-submissions');
DROP POLICY IF EXISTS "Admins read pending resource files" ON storage.objects;
CREATE POLICY "Admins read pending resource files" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='pending-submissions' AND public.is_admin());
DROP POLICY IF EXISTS "Admins delete pending resource files" ON storage.objects;
CREATE POLICY "Admins delete pending resource files" ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='pending-submissions' AND public.is_admin());

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='admin_notifications') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.approve_community_submission(
 p_submission_id UUID, p_subject_id BIGINT, p_module_id BIGINT DEFAULT NULL, p_published_file_path TEXT DEFAULT NULL
) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE submission public.community_submissions%ROWTYPE; target public.subjects%ROWTYPE; new_resource_id BIGINT; kind TEXT;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO submission FROM public.community_submissions WHERE id=p_submission_id FOR UPDATE;
 IF NOT FOUND OR submission.status <> 'pending' THEN RAISE EXCEPTION 'Submission is missing or already reviewed'; END IF;
 SELECT * INTO target FROM public.subjects WHERE id=p_subject_id AND is_published FOR SHARE;
 IF NOT FOUND OR target.branch_id<>submission.branch_id OR target.semester_id<>submission.semester_id THEN RAISE EXCEPTION 'Choose a published subject in the submitted branch and semester'; END IF;
 IF p_module_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.modules WHERE id=p_module_id AND subject_id=p_subject_id) THEN RAISE EXCEPTION 'Module does not belong to the selected subject'; END IF;
 IF p_published_file_path IS NULL OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='study-resources' AND name=p_published_file_path) THEN RAISE EXCEPTION 'Published resource file is missing'; END IF;
 kind := CASE submission.category WHEN 'Handwritten Notes' THEN 'handwritten_notes' WHEN 'Previous Year Question Papers' THEN 'pyq' WHEN 'Model Question Papers' THEN 'model_paper' WHEN 'Solved Question Papers' THEN 'solved_paper' WHEN 'Reference Materials' THEN 'reference_notes' ELSE 'original_notes' END;
 INSERT INTO public.resources(subject_id,module_id,title,description,resource_type,source_category,importance,content_format,file_path,file_name,file_size_bytes,mime_type,category,is_published)
 VALUES(p_subject_id,p_module_id,submission.title,submission.description,kind,'original_student_notes','important','pdf',p_published_file_path,submission.original_file_name,submission.file_size_bytes,submission.mime_type,submission.category,true)
 RETURNING id INTO new_resource_id;
 UPDATE public.community_submissions SET status='approved',reviewed_by=auth.uid(),reviewed_at=NOW(),published_resource_id=new_resource_id WHERE id=p_submission_id;
 UPDATE public.admin_notifications SET read_at=COALESCE(read_at,NOW()) WHERE submission_id=p_submission_id;
 RETURN new_resource_id;
END; $$;
REVOKE ALL ON FUNCTION public.approve_community_submission(UUID,BIGINT,BIGINT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_community_submission(UUID,BIGINT,BIGINT,TEXT) TO authenticated;
-- Admin approval is a database transaction: only admins can publish a verified resource,
-- metadata is checked against the submitted branch/semester, and repeat approval is rejected.
