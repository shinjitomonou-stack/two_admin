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
