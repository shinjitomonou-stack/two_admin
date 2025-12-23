-- Make job_id optional and add billing_cycle to client_job_contracts
ALTER TABLE public.client_job_contracts 
ALTER COLUMN job_id DROP NOT NULL;

-- Add trading_type if missing (noticed it being used in UI but maybe not in schema yet)
-- Looking at schema.sql, client_job_contracts didn't have trading_type but create page uses it.
-- Let's check if it exists or needs to be added.
-- UI uses: trading_type: formData.trading_type

ALTER TABLE public.client_job_contracts
ADD COLUMN IF NOT EXISTS trading_type TEXT CHECK (trading_type IN ('RECEIVING', 'PLACING'));

ALTER TABLE public.client_job_contracts
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('ONCE', 'MONTHLY', 'QUARTERLY', 'YEARLY')) DEFAULT 'ONCE';

ALTER TABLE public.client_job_contracts
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Update individual contracts list for workers as well? 
-- The request was specifically about "クライアントの契約の個別契約" (Client individual contracts).
