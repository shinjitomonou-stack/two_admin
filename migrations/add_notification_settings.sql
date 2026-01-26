-- Add notification settings to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS enable_line_notifications boolean DEFAULT true;
