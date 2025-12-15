ALTER TABLE public.job_individual_contracts 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;
