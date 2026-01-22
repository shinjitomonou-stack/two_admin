-- Fix RLS for basic contracts to allow workers to insert their own signed records
-- This is necessary when an admin hasn't pre-created a PENDING record.

-- 1. DROP old policies
DROP POLICY IF EXISTS "Workers can view own basic contracts" ON public.worker_basic_contracts;
DROP POLICY IF EXISTS "Workers can sign own basic contracts" ON public.worker_basic_contracts;

-- 2. CREATE updated policies
-- SELECT
CREATE POLICY "Workers can view own basic contracts" ON public.worker_basic_contracts
    FOR SELECT USING (auth.uid() = worker_id);

-- INSERT (Crucial: Allows workers to create their own signed contract record)
CREATE POLICY "Workers can insert own basic contracts" ON public.worker_basic_contracts
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- UPDATE
CREATE POLICY "Workers can sign own basic contracts" ON public.worker_basic_contracts
    FOR UPDATE USING (auth.uid() = worker_id);
