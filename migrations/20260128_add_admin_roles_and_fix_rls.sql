-- 1. Add role column to admin_users
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role text DEFAULT 'USER';

-- 2. Add constraint for valid roles
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_role_check 
CHECK (role IN ('SYSTEM', 'ADMIN', 'USER'));

-- 3. Initialize existing admins to 'ADMIN' if they don't have a role
UPDATE public.admin_users SET role = 'ADMIN' WHERE role IS NULL;

-- 4. Fix RLS on admin_users
-- Current policy "Admins can read own record" only allows reading own record.
-- We want all admins to see all other admins.
DROP POLICY IF EXISTS "Admins can read own record" ON public.admin_users;
DROP POLICY IF EXISTS "Users can read own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can read all admin records" ON public.admin_users;

CREATE POLICY "Admins can read all admin records"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Also allow admins to manage other admins (except for certain safety checks in app logic)
DROP POLICY IF EXISTS "Admins can manage all admin records" ON public.admin_users;
CREATE POLICY "Admins can manage all admin records"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_admin());
