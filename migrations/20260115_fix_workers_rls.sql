-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- 1. Allow workers to view their own data
DROP POLICY IF EXISTS "Workers can view own profile" ON public.workers;
CREATE POLICY "Workers can view own profile" 
ON public.workers FOR SELECT 
USING (auth.uid() = id);

-- 2. Allow workers to update their own data
DROP POLICY IF EXISTS "Workers can update own profile" ON public.workers;
CREATE POLICY "Workers can update own profile" 
ON public.workers FOR UPDATE 
USING (auth.uid() = id);

-- 3. Allow insertion during registration
DROP POLICY IF EXISTS "Allow individual insert" ON public.workers;
CREATE POLICY "Allow individual insert" 
ON public.workers FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Allow admins to manage all workers
DROP POLICY IF EXISTS "Admins can manage all workers" ON public.workers;
CREATE POLICY "Admins can manage all workers" 
ON public.workers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid()
  )
);
