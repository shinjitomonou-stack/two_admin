-- Add individual_contract_id to job_applications to allow linking existing contracts
ALTER TABLE job_applications 
ADD COLUMN individual_contract_id UUID REFERENCES job_individual_contracts(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_job_applications_individual_contract_id ON job_applications(individual_contract_id);

-- Update existing records if needed (initially empty)
COMMENT ON COLUMN job_applications.individual_contract_id IS '紐付けられた個別契約書のID。既存契約を使い回すことを可能にします。';
