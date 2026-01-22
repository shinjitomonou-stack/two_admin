-- Ensure authenticated users can select from admin_users (required for RLS subqueries)
GRANT SELECT ON TABLE public.admin_users TO authenticated;

-- Enable RLS on admin_users if not already enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own admin record
-- This is necessary for the check: EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
DROP POLICY IF EXISTS "Users can read own admin record" ON public.admin_users;
CREATE POLICY "Users can read own admin record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid());
