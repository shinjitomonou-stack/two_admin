-- Add tax mode columns to jobs table
ALTER TABLE public.jobs
ADD COLUMN reward_tax_mode TEXT CHECK (reward_tax_mode IN ('EXCL', 'INCL')) DEFAULT 'EXCL',
ADD COLUMN billing_tax_mode TEXT CHECK (billing_tax_mode IN ('EXCL', 'INCL')) DEFAULT 'EXCL';
