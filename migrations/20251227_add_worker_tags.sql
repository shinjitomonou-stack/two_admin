-- Add tags column to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create an index for faster tag searching
CREATE INDEX IF NOT EXISTS idx_workers_tags ON workers USING GIN (tags);
