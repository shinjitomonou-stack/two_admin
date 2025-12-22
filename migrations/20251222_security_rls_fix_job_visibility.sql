-- RLS Policy Fix: Allow workers to see jobs they are associated with
-- This fixes the "Unknown Job Title" issue when a job is no longer in 'OPEN' status.

-- 1. Drop the restrictive policy
DROP POLICY IF EXISTS "Anyone can view open jobs" ON public.jobs;

-- 2. Create a more inclusive policy
-- Workers can see: 
-- a) Any job that is currently 'OPEN'
-- b) Any job they have personally applied to (even if it's closed/assigned)
CREATE POLICY "Workers can view open or applied jobs" ON public.jobs
    FOR SELECT USING (
        status = 'OPEN' OR 
        EXISTS (
            SELECT 1 FROM public.job_applications
            WHERE job_applications.job_id = jobs.id
            AND job_applications.worker_id = auth.uid()
        )
    );
