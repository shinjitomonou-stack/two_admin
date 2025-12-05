-- Add contract_type to clients table
ALTER TABLE public.clients 
ADD COLUMN contract_type TEXT CHECK (contract_type IN ('RECEIVING', 'PLACING')) DEFAULT 'RECEIVING';

-- Add comment for clarity
COMMENT ON COLUMN public.clients.contract_type IS 'RECEIVING: 受注 (請求する), PLACING: 発注 (支払う)';
