-- Allow workers to view active report templates
CREATE POLICY "Workers can view active report templates" ON public.report_templates
    FOR SELECT USING (is_active = true);

-- Allow workers to view jobs they have applied for (not just OPEN jobs)
CREATE POLICY "Workers can view jobs they applied to" ON public.jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.job_applications
            WHERE job_applications.job_id = jobs.id
            AND job_applications.worker_id = auth.uid()
        )
    );
