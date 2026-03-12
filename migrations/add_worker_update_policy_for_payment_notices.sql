-- Allow workers to approve their own payment notices (update status from ISSUED to APPROVED)
CREATE POLICY "Workers can approve own payment_notices"
ON public.payment_notices
FOR UPDATE
TO authenticated
USING (
  worker_id = auth.uid()
  AND status = 'ISSUED'
)
WITH CHECK (
  worker_id = auth.uid()
  AND status = 'APPROVED'
);
