-- Add Party A (Company) signature columns to job_individual_contracts
ALTER TABLE public.job_individual_contracts
ADD COLUMN IF NOT EXISTS party_a_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS party_a_signer_id UUID REFERENCES public.admin_users(id),
ADD COLUMN IF NOT EXISTS party_a_ip_address TEXT,
ADD COLUMN IF NOT EXISTS party_a_user_agent TEXT;

COMMENT ON COLUMN public.job_individual_contracts.party_a_signed_at IS '甲（会社側）の署名/承認日時';
COMMENT ON COLUMN public.job_individual_contracts.party_a_signer_id IS '甲（会社側）の承認を実行した管理者ID';
COMMENT ON COLUMN public.job_individual_contracts.party_a_ip_address IS '甲（会社側）の承認時のIPアドレス';
COMMENT ON COLUMN public.job_individual_contracts.party_a_user_agent IS '甲（会社側）の承認時のユーザーエージェント';
