-- 1. Create a secure function to check admin status
-- This function runs with the privileges of the creator (SECURITY DEFINER),
-- allowing it to check admin_users even if the caller has no direct access.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Fix admin_users RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow admins to view their own record (UI needs this)
DROP POLICY IF EXISTS "Users can read own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can read own record" ON public.admin_users;

CREATE POLICY "Admins can read own record" 
ON public.admin_users 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- 3. Fix contract_templates RLS
-- This addresses the "Contract Template saving" issue
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Remove old policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can do everything on contract_templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Admins can manage contract templates" ON public.contract_templates;

-- Create new robust policy using the security definer function
CREATE POLICY "Admins can manage contract templates"
ON public.contract_templates
FOR ALL
TO authenticated
USING (public.is_admin());

-- 4. Fix job_individual_contracts RLS (Just in case "Individual Contract saving" referred to this)
ALTER TABLE public.job_individual_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage individual contracts" ON public.job_individual_contracts;
CREATE POLICY "Admins can manage individual contracts"
ON public.job_individual_contracts
FOR ALL
TO authenticated
USING (public.is_admin());

-- Ensure workers can still view their assigned contracts
DROP POLICY IF EXISTS "Workers can view own individual contracts" ON public.job_individual_contracts;
CREATE POLICY "Workers can view own individual contracts"
ON public.job_individual_contracts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_applications ja
    WHERE ja.id = application_id
    AND ja.worker_id = auth.uid()
  )
);
