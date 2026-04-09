-- Add renewal_period_months to client_contracts and client_job_contracts
-- This separates contract renewal period from billing_cycle

ALTER TABLE public.client_contracts
    ADD COLUMN renewal_period_months INTEGER;

ALTER TABLE public.client_job_contracts
    ADD COLUMN renewal_period_months INTEGER;

COMMENT ON COLUMN public.client_contracts.renewal_period_months IS 'Contract renewal period in months (e.g., 1=monthly, 3=quarterly, 12=yearly). NULL means use billing_cycle as fallback.';
COMMENT ON COLUMN public.client_job_contracts.renewal_period_months IS 'Contract renewal period in months (e.g., 1=monthly, 3=quarterly, 12=yearly). NULL means use billing_cycle as fallback.';
