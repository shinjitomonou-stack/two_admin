import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReportForm from "@/components/ReportForm";
import BackButton from "@/components/BackButton";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    const workerId = user?.id;

    if (!workerId) {
        redirect("/login");
    }

    // Fetch job details including template ID
    const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select(`
            id,
            title,
            report_template_id
        `)
        .eq("id", id)
        .single();

    if (jobError || !job) {
        return (
            <div className="p-4 text-red-500">
                Error fetching job: {jobError?.message || "Job not found"}
            </div>
        );
    }

    // Fetch application to verify assignment and get scheduled dates
    const { data: application, error: appError } = await supabase
        .from("job_applications")
        .select(`
            id,
            status,
            scheduled_work_start,
            scheduled_work_end
        `)
        .eq("job_id", id)
        .eq("worker_id", workerId)
        .single();

    if (appError || !application || (application.status !== "ASSIGNED" && application.status !== "CONFIRMED")) {
        return (
            <div className="p-4 text-red-500">
                Error fetching application: {appError?.message || "Application not found or not assigned"}
                <br />
                Status: {application?.status}
                <br />
                WorkerID: {workerId}
                <br />
                JobID: {id}
            </div>
        );
    }

    // Fetch template fields if template ID exists
    let template = undefined;
    if (job.report_template_id) {
        const { data: templateData, error: templateError } = await supabase
            .from("report_templates")
            .select("id, fields")
            .eq("id", job.report_template_id)
            .single();

        if (templateError) {
            console.error("Error fetching report template:", templateError);
        }

        if (templateData) {
            template = templateData;
        } else {
            console.log("No template data found for ID:", job.report_template_id);
        }
    } else {
        console.log("No report_template_id found for job:", id);
    }

    // Format default dates for datetime-local input
    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    };

    const defaultValues = {
        scheduledStart: formatDateTime(application.scheduled_work_start),
        scheduledEnd: formatDateTime(application.scheduled_work_end),
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
                    <BackButton fallbackHref={`/jobs/${id}`} />
                    <h1 className="font-bold text-lg text-slate-900">作業報告</h1>
                </div>
            </header>

            <div className="max-w-md mx-auto px-4 py-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        作業が完了したら、以下のフォームから報告を提出してください。
                    </p>
                </div>

                <ReportForm
                    applicationId={application.id}
                    jobId={job.id}
                    template={template}
                    defaultValues={defaultValues}
                />
            </div>
        </div>
    );
}
