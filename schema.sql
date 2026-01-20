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
