-- Fix RLS for individual contracts to use worker_id directly
-- Previous policy relied on application_id which is now nullable and not always set

DROP POLICY IF EXISTS "Workers can view own individual contracts" ON public.job_individual_contracts;

-- Allow viewing if the contract is assigned to the worker
CREATE POLICY "Workers can view own individual contracts" ON public.job_individual_contracts
    FOR SELECT USING (
        worker_id = auth.uid()
    );

-- Allow updating (signing) if the contract is assigned to the worker
-- Restricting this to only specific fields via trigger or generic update is better, 
-- but for now enabling update for own contracts is standard.
CREATE POLICY "Workers can update own individual contracts" ON public.job_individual_contracts
    FOR UPDATE USING (
        worker_id = auth.uid()
    );
