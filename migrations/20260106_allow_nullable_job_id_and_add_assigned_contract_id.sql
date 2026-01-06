-- 1. Make job_id nullable in client_job_contracts
ALTER TABLE public.client_job_contracts ALTER COLUMN job_id DROP NOT NULL;

-- 2. Add assigned_contract_id to jobs table
ALTER TABLE public.jobs ADD COLUMN assigned_contract_id UUID REFERENCES public.client_job_contracts(id);
