-- Add new columns for worker management
ALTER TABLE public.workers
ADD COLUMN max_workers INTEGER DEFAULT 1,
ADD COLUMN schedule_notes TEXT;
