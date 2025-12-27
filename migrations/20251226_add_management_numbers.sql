-- Create sequences starting at 10001
CREATE SEQUENCE IF NOT EXISTS worker_number_seq START 10001;
CREATE SEQUENCE IF NOT EXISTS client_number_seq START 10001;

-- Add columns to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS worker_number TEXT UNIQUE;

-- Add columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_number TEXT UNIQUE;

-- Backfill existing workers
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM workers WHERE worker_number IS NULL ORDER BY created_at ASC LOOP
        UPDATE workers SET worker_number = nextval('worker_number_seq')::text WHERE id = r.id;
    END LOOP;
END $$;

-- Backfill existing clients
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM clients WHERE client_number IS NULL ORDER BY created_at ASC LOOP
        UPDATE clients SET client_number = nextval('client_number_seq')::text WHERE id = r.id;
    END LOOP;
END $$;

-- Create function for automatic numbering on insert
CREATE OR REPLACE FUNCTION auto_assign_worker_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.worker_number IS NULL THEN
        NEW.worker_number := nextval('worker_number_seq')::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_assign_client_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_number IS NULL THEN
        NEW.client_number := nextval('client_number_seq')::text;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_auto_assign_worker_number ON workers;
CREATE TRIGGER trg_auto_assign_worker_number
BEFORE INSERT ON workers
FOR EACH ROW
EXECUTE FUNCTION auto_assign_worker_number();

DROP TRIGGER IF EXISTS trg_auto_assign_client_number ON clients;
CREATE TRIGGER trg_auto_assign_client_number
BEFORE INSERT ON clients
FOR EACH ROW
EXECUTE FUNCTION auto_assign_client_number();
