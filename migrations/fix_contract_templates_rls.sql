-- Enable RLS on contract_templates
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Allow Admins to perform all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can perform all actions on contract_templates"
ON public.contract_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  )
);
