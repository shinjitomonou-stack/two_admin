-- Add reward type and unit price/quantity fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN reward_type TEXT CHECK (reward_type IN ('FIXED', 'UNIT')) DEFAULT 'FIXED',
ADD COLUMN reward_unit_price DECIMAL(10, 2),
ADD COLUMN billing_unit_price DECIMAL(10, 2),
ADD COLUMN reward_quantity INTEGER;
