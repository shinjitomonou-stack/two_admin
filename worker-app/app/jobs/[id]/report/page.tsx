import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReportForm from "@/components/ReportForm";
import BackButton from "@/components/BackButton";
import { AlertTriangle } from "lucide-react";

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

    if (appError || !application || !["ASSIGNED", "CONFIRMED", "COMPLETED"].includes(application.status)) {
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

    // Check for existing rejected report
    let existingReport: any = null;
    const { data: existingReports } = await supabase
        .from("reports")
        .select("*")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false })
        .limit(1);

    if (existingReports && existingReports.length > 0) {
        const latestReport = existingReports[0];
        if (latestReport.status === "REJECTED") {
            existingReport = latestReport;
        } else if (latestReport.status === "SUBMITTED" || latestReport.status === "APPROVED") {
            // Already submitted or approved, don't allow new submission
            return (
                <div className="min-h-screen bg-slate-50 pb-20">
                    <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
                            <BackButton fallbackHref={`/jobs/${id}`} />
                            <h1 className="font-bold text-lg text-slate-900">作業報告</h1>
                        </div>
                    </header>
                    <div className="max-w-md mx-auto px-4 py-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                            <p className="text-sm text-blue-800 font-medium">この案件の作業報告は既に提出済みです。</p>
                            <Link
                                href="/reports"
                                className="inline-block mt-3 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                報告一覧を見る
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // Fetch template fields if template ID exists
    let template = undefined;
    let templateDiagnostic = { id: job.report_template_id, status: "NONE", error: null as any };

    if (job.report_template_id) {
        templateDiagnostic.status = "FETCHING";
        const { data: templateData, error: templateError } = await supabase
            .from("report_templates")
            .select("id, name, fields")
            .eq("id", job.report_template_id)
            .single();

        if (templateError) {
            console.error("Error fetching report template:", templateError);
            templateDiagnostic.status = "ERROR";
            templateDiagnostic.error = templateError;
        } else if (templateData) {
            template = templateData;
            templateDiagnostic.status = "SUCCESS";
        } else {
            templateDiagnostic.status = "NOT_FOUND";
        }
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
                {/* Rejected report alert */}
                {existingReport && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-red-800 text-sm">作業報告が差し戻されました</h3>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                内容を修正して再提出してください。
                                {existingReport.feedback && (
                                    <span className="block mt-2 bg-white/60 p-2 rounded text-red-800 font-medium">
                                        差し戻し理由: {existingReport.feedback}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                )}

                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {existingReport
                            ? "差し戻された報告を修正して再提出してください。"
                            : "作業が完了したら、以下のフォームから報告を提出してください。"
                        }
                    </p>
                </div>

                <ReportForm
                    applicationId={application.id}
                    jobId={job.id}
                    template={template}
                    defaultValues={defaultValues}
                    existingReport={existingReport}
                />
            </div>
        </div>
    );
}
