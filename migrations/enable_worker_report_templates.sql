-- Allow workers to view active report templates
CREATE POLICY "Workers can view active report templates" ON public.report_templates
    FOR SELECT USING (is_active = true);
