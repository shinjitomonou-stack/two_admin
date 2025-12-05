-- Make client email optional
-- Remove NOT NULL constraint from email
ALTER TABLE public.clients 
ALTER COLUMN email DROP NOT NULL;

-- Remove UNIQUE constraint from email (if it exists)
-- First, find the constraint name
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.clients'::regclass
    AND contype = 'u'
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.clients'::regclass AND attname = 'email')];
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.clients DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.clients.email IS 'メールアドレス（任意）';
