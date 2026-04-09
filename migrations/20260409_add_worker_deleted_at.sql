-- Add soft delete column to workers table
ALTER TABLE public.workers ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for efficient filtering of active workers
CREATE INDEX idx_workers_deleted_at ON public.workers(deleted_at) WHERE deleted_at IS NULL;
