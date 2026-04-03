-- Contract renewal history table
-- Tracks auto-renewals and expirations for client_contracts and client_job_contracts

CREATE TABLE public.contract_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_table TEXT NOT NULL CHECK (contract_table IN ('client_contracts', 'client_job_contracts')),
    contract_id UUID NOT NULL,
    previous_end_date DATE NOT NULL,
    new_end_date DATE NOT NULL,
    billing_cycle TEXT NOT NULL,
    renewal_type TEXT NOT NULL CHECK (renewal_type IN ('AUTO_RENEWED', 'EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contract_renewals_contract
    ON public.contract_renewals(contract_table, contract_id);

CREATE INDEX idx_contract_renewals_created_at
    ON public.contract_renewals(created_at DESC);

-- RLS
ALTER TABLE public.contract_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contract_renewals"
    ON public.contract_renewals
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    );
