-- Migration: Add notification_sent_at to client_job_contracts
-- Created: 2025-12-11

ALTER TABLE public.client_job_contracts 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;
