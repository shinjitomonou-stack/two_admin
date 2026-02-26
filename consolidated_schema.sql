-- Enable PostGIS extension for location features
create extension if not exists postgis;

-- 1. Clients Table
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  address text,
  created_at timestamp with time zone default now()
);

-- 2. Workers Table
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  line_id text unique, -- Nullable for web registration
  line_name text,
  email text unique,
  full_name text not null,
  name_kana text,
  phone text,
  postal_code text,
  address text,
  gender text,
  birth_date date,
  bank_account jsonb, -- Encrypted bank details
  rank text default 'Bronze',
  password_hash text, -- Added for web auth
  is_verified boolean default false,
  created_at timestamp with time zone default now()
);

-- 3. Contract Templates (Master & Individual)
create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('BASIC', 'INDIVIDUAL')) not null,
  title text not null,
  content_template text not null,
  version text not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 4. Worker Basic Contracts (Signed Master Agreements)
create table public.worker_basic_contracts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.workers(id) not null,
  template_id uuid references public.contract_templates(id) not null,
  signed_content_snapshot text, -- Nullable until signed
  signed_at timestamp with time zone, -- Nullable until signed
  ip_address text,
  user_agent text,
  consent_hash text,
  status text check (status in ('PENDING', 'SIGNED', 'REJECTED')) default 'PENDING',
  created_at timestamp with time zone default now()
);

-- 4. Report Templates
create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  fields jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 5. Jobs Table
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) not null,
  title text not null,
  description text,
  job_type text,
  reward_amount decimal(10, 2) not null,
  billing_amount decimal(10, 2), -- Amount billed to client
  max_workers int default 1,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  location geography(Point, 4326), -- PostGIS Point
  address_text text,
  location_radius_meters float default 300.0,
  status text check (status in ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')) default 'DRAFT',
  is_flexible boolean default false,
  work_period_start timestamp with time zone,
  work_period_end timestamp with time zone,
  schedule_notes text, -- Notes about schedule/timing for workers
  report_template_id uuid references public.report_templates(id),
  reward_tax_mode text check (reward_tax_mode in ('EXCL', 'INCL')) default 'EXCL',
  billing_tax_mode text check (billing_tax_mode in ('EXCL', 'INCL')) default 'EXCL',
  auto_set_schedule boolean default false,
  created_at timestamp with time zone default now()
);

-- 6. Job Applications
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) not null,
  worker_id uuid references public.workers(id) not null,
  status text check (status in ('APPLIED', 'ASSIGNED', 'REJECTED', 'CANCELLED', 'CONFIRMED')) default 'APPLIED',
  scheduled_work_start timestamp with time zone,
  scheduled_work_end timestamp with time zone,
  actual_work_start timestamp with time zone,
  actual_work_end timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Company Settings (Singleton)
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    representative_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Ensure only one row exists (optional but good practice)
CREATE UNIQUE INDEX company_settings_singleton_idx ON company_settings ((TRUE));

-- 7. Job Individual Contracts (Signed per job)
create table public.job_individual_contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.job_applications(id) not null,
  template_id uuid references public.contract_templates(id) not null,
  signed_content_snapshot text, -- Nullable until signed
  signed_at timestamp with time zone, -- Nullable until signed
  ip_address text,
  user_agent text,
  is_agreed boolean default false,
  status text check (status in ('PENDING', 'SIGNED', 'REJECTED')) default 'PENDING'
);

-- 8. Reports (Work Execution)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.job_applications(id) not null,
  work_start_at timestamp with time zone,
  work_start_location geography(Point, 4326),
  work_end_at timestamp with time zone,
  report_text text,
  photo_urls jsonb,
  custom_fields jsonb default '{}',
  status text check (status in ('SUBMITTED', 'APPROVED', 'REJECTED')) default 'SUBMITTED',
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index idx_jobs_location on public.jobs using gist (location);
create index idx_jobs_client on public.jobs(client_id);
create index idx_applications_worker on public.job_applications(worker_id);
create index idx_applications_job on public.job_applications(job_id);

-- 9. Client Contracts (Basic & NDA)
CREATE TABLE public.client_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) NOT NULL,
    contract_type TEXT CHECK (contract_type IN ('BASIC', 'NDA')) NOT NULL,
    template_id UUID REFERENCES public.contract_templates(id),
    title TEXT NOT NULL,
    content_snapshot TEXT,
    status TEXT CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED')) DEFAULT 'DRAFT',
    
    -- 有効期間
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT false,
    
    -- 金額情報
    monthly_amount DECIMAL(12, 2),
    billing_cycle TEXT CHECK (billing_cycle IN ('MONTHLY', 'QUARTERLY', 'YEARLY')),
    
    -- 締結情報
    signed_at TIMESTAMP WITH TIME ZONE,
    signer_name TEXT,
    signer_title TEXT,
    signature_hash TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    -- ファイル管理
    uploaded_files JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Client Job Contracts (Individual per job)
CREATE TABLE public.client_job_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) NOT NULL,
    job_id UUID REFERENCES public.jobs(id) NOT NULL,
    template_id UUID REFERENCES public.contract_templates(id),
    title TEXT NOT NULL,
    content_snapshot TEXT,
    status TEXT CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED')) DEFAULT 'DRAFT',
    
    -- 契約条件
    contract_amount DECIMAL(12, 2) NOT NULL,
    payment_terms TEXT,
    delivery_deadline DATE,
    
    -- 締結情報
    signed_at TIMESTAMP WITH TIME ZONE,
    signer_name TEXT,
    signer_title TEXT,
    signature_hash TEXT,
    ip_address TEXT,
    user_agent TEXT,
    
    -- ファイル管理
    uploaded_files JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client contract indexes
CREATE INDEX idx_client_contracts_client ON public.client_contracts(client_id);
CREATE INDEX idx_client_contracts_status ON public.client_contracts(status);
CREATE INDEX idx_client_contracts_type ON public.client_contracts(contract_type);
CREATE INDEX idx_client_job_contracts_client ON public.client_job_contracts(client_id);
CREATE INDEX idx_client_job_contracts_job ON public.client_job_contracts(job_id);
CREATE INDEX idx_client_job_contracts_status ON public.client_job_contracts(status);

-- Admin Users table
CREATE TABLE public.admin_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policies for admin_users
CREATE POLICY "Admins can view own data" ON public.admin_users
    FOR SELECT USING (auth.uid() = id);
-- 11. Payment Notices
CREATE TABLE public.payment_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES public.workers(id) NOT NULL,
    month TEXT NOT NULL, -- Format: YYYY-MM
    status TEXT CHECK (status IN ('DRAFT', 'ISSUED', 'APPROVED', 'PAID')) DEFAULT 'DRAFT',
    total_amount DECIMAL(12, 2) NOT NULL, -- Total amount (pre-tax)
    tax_amount DECIMAL(12, 2) NOT NULL, -- Tax amount
    job_details JSONB NOT NULL DEFAULT '[]', -- Snapshot of jobs included in this notice
    issued_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_ip_address TEXT, -- IP address when approved
    approved_user_agent TEXT, -- User agent when approved
    paid_at TIMESTAMP WITH TIME ZONE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_notices_worker ON public.payment_notices(worker_id);
CREATE INDEX idx_payment_notices_month ON public.payment_notices(month);
CREATE INDEX idx_payment_notices_status ON public.payment_notices(status);

-- Payment Schedules (Monthly Payment Date Master)
CREATE TABLE public.payment_schedules (
    month TEXT PRIMARY KEY, -- Format: YYYY-MM
    scheduled_payment_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.payment_schedules IS 'Monthly payment schedule master table';
COMMENT ON COLUMN public.payment_schedules.month IS 'Target month in YYYY-MM format';
COMMENT ON COLUMN public.payment_schedules.scheduled_payment_date IS 'Scheduled payment date for all notices in this month';
-- RLS Policy Fix: Allow workers to see jobs they are associated with
-- This fixes the "Unknown Job Title" issue when a job is no longer in 'OPEN' status.

-- 1. Drop the restrictive policy
DROP POLICY IF EXISTS "Anyone can view open jobs" ON public.jobs;

-- 2. Create a more inclusive policy
-- Workers can see: 
-- a) Any job that is currently 'OPEN'
-- b) Any job they have personally applied to (even if it's closed/assigned)
CREATE POLICY "Workers can view open or applied jobs" ON public.jobs
    FOR SELECT USING (
        status = 'OPEN' OR 
        EXISTS (
            SELECT 1 FROM public.job_applications
            WHERE job_applications.job_id = jobs.id
            AND job_applications.worker_id = auth.uid()
        )
    );
-- 1. Security Helper Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_basic_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_individual_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_job_contracts ENABLE ROW LEVEL SECURITY;

-- 3. ADMIN POLICIES (Grant full access to admins)
-- Note: Admin App also uses Service Role, but these policies provide safety for authenticated sessions.

-- Factory-like application for all tables
DO $$
DECLARE
    tbl_name text;
    tables text[] := ARRAY[
        'clients', 'workers', 'contract_templates', 'worker_basic_contracts', 
        'report_templates', 'jobs', 'job_applications', 'company_settings', 
        'job_individual_contracts', 'reports', 'client_contracts', 'client_job_contracts'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY tables LOOP
        EXECUTE format('CREATE POLICY "Admins have full access on %I" ON public.%I FOR ALL USING (public.is_admin())', tbl_name, tbl_name);
    END LOOP;
END $$;

-- 4. WORKER POLICIES (Step 2: Isolation)

-- Workers can view and edit their own profile
CREATE POLICY "Workers can view own profile" ON public.workers
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Workers can update own profile" ON public.workers
    FOR UPDATE USING (auth.uid() = id);

-- Workers can view open jobs
CREATE POLICY "Anyone can view open jobs" ON public.jobs
    FOR SELECT USING (status = 'OPEN');

-- Workers can view their own applications
CREATE POLICY "Workers can view own applications" ON public.job_applications
    FOR SELECT USING (auth.uid() = worker_id);

-- Workers can insert applications for themselves
CREATE POLICY "Workers can apply for jobs" ON public.job_applications
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Workers can view and update their own reports
-- Reports are linked to applications, which are linked to workers
CREATE POLICY "Workers can manage own reports" ON public.reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.job_applications
            WHERE job_applications.id = reports.application_id
            AND job_applications.worker_id = auth.uid()
        )
    );

-- Workers can view basic contracts sent to them
CREATE POLICY "Workers can view own basic contracts" ON public.worker_basic_contracts
    FOR SELECT USING (auth.uid() = worker_id);

CREATE POLICY "Workers can sign own basic contracts" ON public.worker_basic_contracts
    FOR UPDATE USING (auth.uid() = worker_id);

-- Workers can view individual contracts linked to their applications
CREATE POLICY "Workers can view own individual contracts" ON public.job_individual_contracts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.job_applications
            WHERE job_applications.id = job_individual_contracts.application_id
            AND job_applications.worker_id = auth.uid()
        )
    );

-- Workers can view templates needed for signing
CREATE POLICY "Workers can view contract templates" ON public.contract_templates
    FOR SELECT USING (is_active = true);

-- Anyone can view company settings (needed for footer/contact info)
CREATE POLICY "Anyone can view company settings" ON public.company_settings
    FOR SELECT USING (true);
-- Make job_id optional and add billing_cycle to client_job_contracts
ALTER TABLE public.client_job_contracts 
ALTER COLUMN job_id DROP NOT NULL;

-- Add trading_type if missing (noticed it being used in UI but maybe not in schema yet)
-- Looking at schema.sql, client_job_contracts didn't have trading_type but create page uses it.
-- Let's check if it exists or needs to be added.
-- UI uses: trading_type: formData.trading_type

ALTER TABLE public.client_job_contracts
ADD COLUMN IF NOT EXISTS trading_type TEXT CHECK (trading_type IN ('RECEIVING', 'PLACING'));

ALTER TABLE public.client_job_contracts
ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('ONCE', 'MONTHLY', 'QUARTERLY', 'YEARLY')) DEFAULT 'ONCE';

ALTER TABLE public.client_job_contracts
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS is_auto_renew BOOLEAN DEFAULT FALSE;

-- Update individual contracts list for workers as well? 
-- The request was specifically about "クライアントの契約の個別契約" (Client individual contracts).
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
-- Add tags column to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create an index for faster tag searching
CREATE INDEX IF NOT EXISTS idx_workers_tags ON workers USING GIN (tags);
-- 1. Make job_id nullable in client_job_contracts
ALTER TABLE public.client_job_contracts ALTER COLUMN job_id DROP NOT NULL;

-- 2. Add assigned_contract_id to jobs table
ALTER TABLE public.jobs ADD COLUMN assigned_contract_id UUID REFERENCES public.client_job_contracts(id);
-- Enable RLS
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- 1. Allow workers to view their own data
DROP POLICY IF EXISTS "Workers can view own profile" ON public.workers;
CREATE POLICY "Workers can view own profile" 
ON public.workers FOR SELECT 
USING (auth.uid() = id);

-- 2. Allow workers to update their own data
DROP POLICY IF EXISTS "Workers can update own profile" ON public.workers;
CREATE POLICY "Workers can update own profile" 
ON public.workers FOR UPDATE 
USING (auth.uid() = id);

-- 3. Allow insertion during registration
DROP POLICY IF EXISTS "Allow individual insert" ON public.workers;
CREATE POLICY "Allow individual insert" 
ON public.workers FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Allow admins to manage all workers
DROP POLICY IF EXISTS "Admins can manage all workers" ON public.workers;
CREATE POLICY "Admins can manage all workers" 
ON public.workers FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid()
  )
);
-- Add Party A (Company) signature columns to job_individual_contracts
ALTER TABLE public.job_individual_contracts
ADD COLUMN IF NOT EXISTS party_a_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS party_a_signer_id UUID REFERENCES public.admin_users(id),
ADD COLUMN IF NOT EXISTS party_a_ip_address TEXT,
ADD COLUMN IF NOT EXISTS party_a_user_agent TEXT;

COMMENT ON COLUMN public.job_individual_contracts.party_a_signed_at IS '甲（会社側）の署名/承認日時';
COMMENT ON COLUMN public.job_individual_contracts.party_a_signer_id IS '甲（会社側）の承認を実行した管理者ID';
COMMENT ON COLUMN public.job_individual_contracts.party_a_ip_address IS '甲（会社側）の承認時のIPアドレス';
COMMENT ON COLUMN public.job_individual_contracts.party_a_user_agent IS '甲（会社側）の承認時のユーザーエージェント';
-- Fix RLS for basic contracts to allow workers to insert their own signed records
-- This is necessary when an admin hasn't pre-created a PENDING record.

-- 1. DROP old policies
DROP POLICY IF EXISTS "Workers can view own basic contracts" ON public.worker_basic_contracts;
DROP POLICY IF EXISTS "Workers can sign own basic contracts" ON public.worker_basic_contracts;

-- 2. CREATE updated policies
-- SELECT
CREATE POLICY "Workers can view own basic contracts" ON public.worker_basic_contracts
    FOR SELECT USING (auth.uid() = worker_id);

-- INSERT (Crucial: Allows workers to create their own signed contract record)
CREATE POLICY "Workers can insert own basic contracts" ON public.worker_basic_contracts
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- UPDATE
CREATE POLICY "Workers can sign own basic contracts" ON public.worker_basic_contracts
    FOR UPDATE USING (auth.uid() = worker_id);
-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for the bucket
-- Allow public access for viewing (or restrict to authenticated if needed)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'report-photos' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'report-photos' );

-- Allow users to delete their own uploads
-- In this case, since we use applicationId in the path, we just allow authenticated for now
-- A stricter policy would check if the user is the owner
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'report-photos' );
-- 1. Add role column to admin_users
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role text DEFAULT 'USER';

-- 2. Initialize existing admins to 'ADMIN' BEFORE adding constraint
-- This ensures that the constraint added in the next step is not violated immediately.
UPDATE public.admin_users SET role = 'ADMIN' WHERE role IS NULL OR role NOT IN ('SYSTEM', 'ADMIN', 'USER');

-- 3. Add constraint for valid roles
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_role_check 
CHECK (role IN ('SYSTEM', 'ADMIN', 'USER'));

-- 4. Fix RLS on admin_users
-- Current policy "Admins can read own record" only allows reading own record.
-- We want all admins to see all other admins.
DROP POLICY IF EXISTS "Admins can read own record" ON public.admin_users;
DROP POLICY IF EXISTS "Users can read own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can read all admin records" ON public.admin_users;

CREATE POLICY "Admins can read all admin records"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Also allow admins to manage other admins (except for certain safety checks in app logic)
DROP POLICY IF EXISTS "Admins can manage all admin records" ON public.admin_users;
CREATE POLICY "Admins can manage all admin records"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_admin());
-- Add individual_contract_id to job_applications to allow linking existing contracts
ALTER TABLE job_applications 
ADD COLUMN individual_contract_id UUID REFERENCES job_individual_contracts(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_job_applications_individual_contract_id ON job_applications(individual_contract_id);

-- Update existing records if needed (initially empty)
COMMENT ON COLUMN job_applications.individual_contract_id IS '紐付けられた個別契約書のID。既存契約を使い回すことを可能にします。';
-- Add client_id column to contract_templates
ALTER TABLE public.contract_templates 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_contract_templates_client_id ON public.contract_templates(client_id);
-- Migration: Add announcements and worker announcement reads tables
-- Created: 2025-12-04

-- Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('INFO', 'WARNING', 'IMPORTANT')) DEFAULT 'INFO',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Worker announcement reads tracking
CREATE TABLE IF NOT EXISTS public.worker_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE NOT NULL,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(worker_id, announcement_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON public.announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_worker_announcement_reads_worker ON public.worker_announcement_reads(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_announcement_reads_announcement ON public.worker_announcement_reads(announcement_id);

-- Add comments
COMMENT ON TABLE public.announcements IS 'System announcements and notifications for workers';
COMMENT ON TABLE public.worker_announcement_reads IS 'Tracks which announcements have been read by which workers';
COMMENT ON COLUMN public.announcements.type IS 'Announcement type: INFO, WARNING, or IMPORTANT';
COMMENT ON COLUMN public.announcements.is_active IS 'Whether the announcement is currently active';
COMMENT ON COLUMN public.announcements.expires_at IS 'Optional expiration date for the announcement';

-- Insert sample announcements
INSERT INTO public.announcements (title, content, type, is_active) VALUES
('Teo Workへようこそ！', 'Teo Workをご利用いただきありがとうございます。プロフィールを充実させて、より多くの案件に応募しましょう！', 'INFO', true),
('年末年始の営業について', '12月29日から1月3日まで休業とさせていただきます。緊急のお問い合わせは support@teo-work.com までご連絡ください。', 'IMPORTANT', true);
-- Add contract_type to clients table
ALTER TABLE public.clients 
ADD COLUMN contract_type TEXT CHECK (contract_type IN ('RECEIVING', 'PLACING')) DEFAULT 'RECEIVING';

-- Add comment for clarity
COMMENT ON COLUMN public.clients.contract_type IS 'RECEIVING: 受注 (請求する), PLACING: 発注 (支払う)';
-- Migration: Add additional client information fields
-- Created: 2025-12-04

-- Add business information
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS representative_name TEXT;

-- Add bank account information
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_branch_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_account_type TEXT CHECK (bank_account_type IN ('普通', '当座', NULL));
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;

-- Add billing contact information
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_contact_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_contact_email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_contact_phone TEXT;

-- Add billing method
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_method TEXT CHECK (billing_method IN ('銀行振込', '請求書払い', 'クレジットカード', 'その他', NULL)) DEFAULT '銀行振込';

-- Add comment for documentation
COMMENT ON COLUMN public.clients.business_number IS '事業者番号（法人番号など）';
COMMENT ON COLUMN public.clients.representative_name IS '代表者名';
COMMENT ON COLUMN public.clients.bank_name IS '銀行名';
COMMENT ON COLUMN public.clients.bank_branch_name IS '支店名';
COMMENT ON COLUMN public.clients.bank_account_type IS '口座種別（普通/当座）';
COMMENT ON COLUMN public.clients.bank_account_number IS '口座番号';
COMMENT ON COLUMN public.clients.bank_account_holder IS '口座名義';
COMMENT ON COLUMN public.clients.billing_contact_name IS '請求担当者氏名';
COMMENT ON COLUMN public.clients.billing_contact_email IS '請求担当者メールアドレス';
COMMENT ON COLUMN public.clients.billing_contact_phone IS '請求担当者電話番号';
COMMENT ON COLUMN public.clients.billing_method IS '請求方法';
-- Add notification settings to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS enable_line_notifications boolean DEFAULT true;
-- Migration: Add notification_sent_at to client_job_contracts
-- Created: 2025-12-11

ALTER TABLE public.client_job_contracts 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.job_individual_contracts 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;
-- Add tax mode columns to jobs table
ALTER TABLE public.jobs
ADD COLUMN reward_tax_mode TEXT CHECK (reward_tax_mode IN ('EXCL', 'INCL')) DEFAULT 'EXCL',
ADD COLUMN billing_tax_mode TEXT CHECK (billing_tax_mode IN ('EXCL', 'INCL')) DEFAULT 'EXCL';
-- Add reward type and unit price/quantity fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN reward_type TEXT CHECK (reward_type IN ('FIXED', 'UNIT')) DEFAULT 'FIXED',
ADD COLUMN reward_unit_price DECIMAL(10, 2),
ADD COLUMN billing_unit_price DECIMAL(10, 2),
ADD COLUMN reward_quantity INTEGER;
-- Add new columns for worker management
ALTER TABLE public.workers
ADD COLUMN max_workers INTEGER DEFAULT 1,
ADD COLUMN schedule_notes TEXT;
-- Enable RLS for payment_notices
ALTER TABLE public.payment_notices ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on payment_notices
CREATE POLICY "Admins can do everything on payment_notices"
ON public.payment_notices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE public.admin_users.id = auth.uid()
  )
);

-- Workers can view their own payment_notices
CREATE POLICY "Workers can view own payment_notices"
ON public.payment_notices
FOR SELECT
TO authenticated
USING (
  worker_id = auth.uid()
);

-- Enable RLS for payment_schedules
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on payment_schedules
CREATE POLICY "Admins can do everything on payment_schedules"
ON public.payment_schedules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE public.admin_users.id = auth.uid()
  )
);

-- Workers can view all payment_schedules
CREATE POLICY "Workers can view all payment_schedules"
ON public.payment_schedules
FOR SELECT
TO authenticated
USING (true);


-- Enable RLS for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on announcements
CREATE POLICY "Admins can do everything on announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE public.admin_users.id = auth.uid()
  )
);

-- All authenticated users (including workers) can view announcements
-- Note: Logic for filtering active/expired announcements should be in the application query, 
-- but RLS here allows access to all rows for simplicity, or we could restrict to is_active = true if strictness is needed.
-- For now, allowing read access to all is safest to avoid "missing data" issues, assuming expiration logic is handled in UI/API.
CREATE POLICY "Everyone can view announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (true);


-- Enable RLS for worker_announcement_reads
ALTER TABLE public.worker_announcement_reads ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on worker_announcement_reads
CREATE POLICY "Admins can do everything on worker_announcement_reads"
ON public.worker_announcement_reads
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE public.admin_users.id = auth.uid()
  )
);

-- Workers can insert their own read status
CREATE POLICY "Workers can insert own read status"
ON public.worker_announcement_reads
FOR INSERT
TO authenticated
WITH CHECK (
  worker_id = auth.uid()
);

-- Workers can view their own read status
CREATE POLICY "Workers can view own read status"
ON public.worker_announcement_reads
FOR SELECT
TO authenticated
USING (
  worker_id = auth.uid()
);
-- Allow workers to view active report templates
CREATE POLICY "Workers can view active report templates" ON public.report_templates
    FOR SELECT USING (is_active = true);

-- Allow workers to view jobs they have applied for (not just OPEN jobs)
CREATE POLICY "Workers can view jobs they applied to" ON public.jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.job_applications
            WHERE job_applications.job_id = jobs.id
            AND job_applications.worker_id = auth.uid()
        )
    );
-- 1. Create a secure function to check admin status
-- This function runs with the privileges of the creator (SECURITY DEFINER),
-- allowing it to check admin_users even if the caller has no direct access.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Fix admin_users RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow admins to view their own record (UI needs this)
DROP POLICY IF EXISTS "Users can read own admin record" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can read own record" ON public.admin_users;

CREATE POLICY "Admins can read own record" 
ON public.admin_users 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- 3. Fix contract_templates RLS
-- This addresses the "Contract Template saving" issue
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Remove old policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can do everything on contract_templates" ON public.contract_templates;
DROP POLICY IF EXISTS "Admins can manage contract templates" ON public.contract_templates;

-- Create new robust policy using the security definer function
CREATE POLICY "Admins can manage contract templates"
ON public.contract_templates
FOR ALL
TO authenticated
USING (public.is_admin());

-- 4. Fix job_individual_contracts RLS (Just in case "Individual Contract saving" referred to this)
ALTER TABLE public.job_individual_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage individual contracts" ON public.job_individual_contracts;
CREATE POLICY "Admins can manage individual contracts"
ON public.job_individual_contracts
FOR ALL
TO authenticated
USING (public.is_admin());

-- Ensure workers can still view their assigned contracts
DROP POLICY IF EXISTS "Workers can view own individual contracts" ON public.job_individual_contracts;
CREATE POLICY "Workers can view own individual contracts"
ON public.job_individual_contracts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.job_applications ja
    WHERE ja.id = application_id
    AND ja.worker_id = auth.uid()
  )
);
-- Ensure authenticated users can select from admin_users (required for RLS subqueries)
GRANT SELECT ON TABLE public.admin_users TO authenticated;

-- Enable RLS on admin_users if not already enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own admin record
-- This is necessary for the check: EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
DROP POLICY IF EXISTS "Users can read own admin record" ON public.admin_users;
CREATE POLICY "Users can read own admin record"
ON public.admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid());
-- Enable RLS on contract_templates
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Allow Admins to perform all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can perform all actions on contract_templates"
ON public.contract_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  )
);
-- Fix RLS for individual contracts to use worker_id directly
-- Previous policy relied on application_id which is now nullable and not always set

DROP POLICY IF EXISTS "Workers can view own individual contracts" ON public.job_individual_contracts;

-- Allow viewing if the contract is assigned to the worker
CREATE POLICY "Workers can view own individual contracts" ON public.job_individual_contracts
    FOR SELECT USING (
        worker_id = auth.uid()
    );

-- Allow updating (signing) if the contract is assigned to the worker
-- Restricting this to only specific fields via trigger or generic update is better, 
-- but for now enabling update for own contracts is standard.
CREATE POLICY "Workers can update own individual contracts" ON public.job_individual_contracts
    FOR UPDATE USING (
        worker_id = auth.uid()
    );
-- Add worker_id column to job_individual_contracts
ALTER TABLE public.job_individual_contracts 
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES public.workers(id);

-- Backfill worker_id from job_applications
UPDATE public.job_individual_contracts jic
SET worker_id = ja.worker_id
FROM public.job_applications ja
WHERE jic.application_id = ja.id
AND jic.worker_id IS NULL;

-- Make application_id nullable
ALTER TABLE public.job_individual_contracts 
ALTER COLUMN application_id DROP NOT NULL;
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
UPDATE public.workers
SET bank_account = NULL
WHERE id IN (
  '90ac1399-e3c0-4f03-9339-9abd9133a6d5',
  'b58e37c6-8d0f-4379-897e-8a631c6e4095',
  'f91f3032-9540-4e14-b744-fe1fa8af1ac7',
  'b6376062-1f5d-4a2c-98bc-337dcb8f98f1',
  '5f76f678-a6ad-48a8-a501-7582297bd576',
  '8cd01014-b255-4b2e-b1bc-dbd7062c4867',
  '5a12372c-f245-4b69-82c0-2660787bdeaf',
  'f15efc72-bade-4263-9eda-08f8083be72f',
  'e6223245-55ae-432e-9529-5fd67be0ab8f',
  '1a14f915-420f-4cdd-a59e-373c7a4ce574',
  '05813ba0-1070-43ac-aed9-c841e7638bbd',
  'd447e332-95d9-4ea8-b52a-6e396ec40c87',
  '1f376a49-7499-47a8-9939-434b140f2f4a',
  '02fc7d62-afec-430d-9ec2-c3cc13efe143',
  'da1020b1-2b60-4494-bf95-8a22a6cb3f70',
  'a0cbc754-3d8f-4379-a6af-2dc65c17a797',
  '91fcced6-6593-4251-ac73-880669ad5eed',
  '5cd6f8f0-0f2a-415a-a145-337e429f536b',
  '997d892b-e11c-4c4b-876c-dbead2479a3a',
  'f52b20d3-d560-4b19-9865-061f96469f75',
  '03ee2c55-c1e2-46f8-a550-f8d032145c7a',
  '61ce68df-4089-4b3f-b104-fc8b727fa10e',
  '3b0cc528-615c-441f-a79f-92889a4bed7', -- Note: This ID seems to be missing a character (35 chars)
  'ad9b10a8-ed46-473c-aebd-f6186bf99fdc',
  'bc98b1e9-3ddc-4a2f-a0d4-b7e7e9377ce8',
  'a2bdf036-f366-4309-b4f4-4a3d1ba4e6da',
  '6d1bf0cd-d09e-46c1-928c-68b8af239117',
  '2a2d4cf4-c2d3-4ddb-8852-65200b097c88',
  'b9fe2a5b-56fc-4c4a-90d6-fa6a3bd6a866',
  '0d3b4133-bea1-43f1-83ff-a362fb5ca794',
  '9214d4cc-cf41-4f80-8940-04199293ed7d',
  '1efb3144-2d21-4bac-9a28-ed3b7b221257',
  '6b1afeb3-2e5b-4e9b-a512-ab384ea265b8',
  'e579ef8e-f02b-4094-a66e-15f4056f2f98',
  '0597c29f-917b-476e-858d-585b1e7721fa',
  '2d12e13a-3512-4706-bd8e-5467d961e4f3',
  '4e8042d0-b65d-4335-97ad-02d0e04f3f34',
  '3709cdb6-6c9a-498b-9a77-ad3b791c7c3e',
  'eaefb094-0f4e-4758-aef1-0b1dd60dfeb4',
  'b77992ee-a8bd-4516-a579-721e4d874050',
  'f1497247-2572-4ae9-bdcb-ecb3afe88aa4',
  '992d30c4-8c58-4ab6-b2f9-3a06875806d6'
);
-- Remove contract_type from clients table
ALTER TABLE public.clients DROP COLUMN IF EXISTS contract_type;

-- Add trading_type to client_contracts table
ALTER TABLE public.client_contracts 
ADD COLUMN trading_type TEXT CHECK (trading_type IN ('RECEIVING', 'PLACING')) DEFAULT 'RECEIVING';

-- Add comment for clarity
COMMENT ON COLUMN public.client_contracts.trading_type IS 'RECEIVING: 受注 (請求する), PLACING: 発注 (支払う)';

-- Add trading_type to client_job_contracts table as well for individual contracts
ALTER TABLE public.client_job_contracts
ADD COLUMN trading_type TEXT CHECK (trading_type IN ('RECEIVING', 'PLACING')) DEFAULT 'RECEIVING';

COMMENT ON COLUMN public.client_job_contracts.trading_type IS 'RECEIVING: 受注 (請求する), PLACING: 発注 (支払う)';
