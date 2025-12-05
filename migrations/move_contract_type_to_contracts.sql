-- Remove contract_type from clients table
ALTER TABLE public.clients DROP COLUMN IF EXISTS contract_type;

-- Add trading_type to client_contracts table
ALTER TABLE public.client_contracts 
ADD COLUMN trading_type TEXT CHECK (trading_type IN ('RECEIVING', 'PLACING')) DEFAULT 'RECEIVING';

-- Add comment for clarity
COMMENT ON COLUMN public.client_contracts.trading_type IS 'RECEIVING: 受注 (請求する), PLACING: 発注 (支払う)';

-- Add trading_type to client_job_contracts table as well for individual contracts
ALTER TABLE public.client_job_contracts
ADD COLUMN trading_type TEXT CHECK (trading_type IN ('RECEIVING', 'PLACING')) DEFAULT 'RECEIVING';

COMMENT ON COLUMN public.client_job_contracts.trading_type IS 'RECEIVING: 受注 (請求する), PLACING: 発注 (支払う)';
