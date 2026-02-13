-- Enable RLS for payment_notices
ALTER TABLE public.payment_notices ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on payment_notices
CREATE POLICY "Admins can do everything on payment_notices"
ON public.payment_notices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE public.admin_users.id = auth.uid()
  )
);

-- Workers can view their own payment_notices
CREATE POLICY "Workers can view own payment_notices"
ON public.payment_notices
FOR SELECT
TO authenticated
USING (
  worker_id = auth.uid()
);

-- Enable RLS for payment_schedules
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on payment_schedules
CREATE POLICY "Admins can do everything on payment_schedules"
ON public.payment_schedules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE public.admin_users.id = auth.uid()
  )
);

-- Workers can view all payment_schedules
CREATE POLICY "Workers can view all payment_schedules"
ON public.payment_schedules
FOR SELECT
TO authenticated
USING (true);


-- Enable RLS for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on announcements
CREATE POLICY "Admins can do everything on announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE public.admin_users.id = auth.uid()
  )
);

-- All authenticated users (including workers) can view announcements
-- Note: Logic for filtering active/expired announcements should be in the application query, 
-- but RLS here allows access to all rows for simplicity, or we could restrict to is_active = true if strictness is needed.
-- For now, allowing read access to all is safest to avoid "missing data" issues, assuming expiration logic is handled in UI/API.
CREATE POLICY "Everyone can view announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (true);


-- Enable RLS for worker_announcement_reads
ALTER TABLE public.worker_announcement_reads ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on worker_announcement_reads
CREATE POLICY "Admins can do everything on worker_announcement_reads"
ON public.worker_announcement_reads
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE public.admin_users.id = auth.uid()
  )
);

-- Workers can insert their own read status
CREATE POLICY "Workers can insert own read status"
ON public.worker_announcement_reads
FOR INSERT
TO authenticated
WITH CHECK (
  worker_id = auth.uid()
);

-- Workers can view their own read status
CREATE POLICY "Workers can view own read status"
ON public.worker_announcement_reads
FOR SELECT
TO authenticated
USING (
  worker_id = auth.uid()
);
