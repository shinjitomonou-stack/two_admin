-- Add worker_id column to job_individual_contracts
ALTER TABLE public.job_individual_contracts 
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id);

-- Backfill worker_id from job_applications
UPDATE public.job_individual_contracts jic
SET worker_id = ja.worker_id
FROM public.job_applications ja
WHERE jic.application_id = ja.id
AND jic.worker_id IS NULL;

-- Make application_id nullable
ALTER TABLE public.job_individual_contracts 
ALTER COLUMN application_id DROP NOT NULL;
