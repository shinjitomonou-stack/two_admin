-- Add client_id column to contract_templates
ALTER TABLE public.contract_templates 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_contract_templates_client_id ON public.contract_templates(client_id);
