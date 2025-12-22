import Link from "next/link";

export const dynamic = 'force-dynamic';

import { ArrowLeft, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    const workerId = user?.id;

    let reports: any[] = [];
    let workerName = "";

    if (workerId) {
        // Fetch worker name
        const { data: worker } = await supabase
            .from("workers")
            .select("full_name")
            .eq("id", workerId)
            .single();

        if (worker) {
            workerName = worker.full_name;
        }

        // Fetch reports with job details
        const { data: reportsData } = await supabase
            .from("reports")
            .select(`
                id,
                status,
                created_at,
                work_start_at,
                work_end_at,
                report_text,
                job_applications!inner(
                    id,
                    worker_id,
                    jobs(
                        id,
                        title,
                        reward_amount
                    )
                )
            `)
            .eq("job_applications.worker_id", workerId)
            .order("created_at", { ascending: false });

        reports = reportsData || [];
    }

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SUBMITTED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock className="w-3 h-3" />
                        提出済み
                    </span>
                );
            case "APPROVED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        承認済み
                    </span>
                );
            case "REJECTED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        差し戻し
                    </span>
                );
            default:
                return <span className="text-xs text-slate-500">{status}</span>;
        }
    };

    // Calculate statistics
    const stats = {
        total: reports.length,
        submitted: reports.filter(r => r.status === "SUBMITTED").length,
        approved: reports.filter(r => r.status === "APPROVED").length,
        rejected: reports.filter(r => r.status === "REJECTED").length,
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg text-slate-900">作業報告</h1>
                        {workerName && (
                            <p className="text-xs text-slate-500">{workerName} さん</p>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                {!workerId ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                        <p className="text-slate-500 mb-4">ログインしてください</p>
                        <Link
                            href="/login"
                            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            ログイン
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Statistics */}
                        <section className="bg-white rounded-xl border border-slate-200 p-4">
                            <h2 className="font-bold text-slate-900 mb-4 text-sm">報告統計</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-lg p-3">
                                    <div className="text-xs text-slate-600 mb-1">総報告数</div>
                                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                    <div className="text-xs text-green-700 mb-1">承認済み</div>
                                    <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <div className="text-xs text-blue-700 mb-1">提出済み</div>
                                    <div className="text-2xl font-bold text-blue-900">{stats.submitted}</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3">
                                    <div className="text-xs text-red-700 mb-1">差し戻し</div>
                                    <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
                                </div>
                            </div>
                        </section>

                        {/* Reports List */}
                        <section>
                            <h2 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                報告履歴
                            </h2>
                            {reports.length === 0 ? (
                                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm mb-4">まだ作業報告がありません</p>
                                    <Link
                                        href="/"
                                        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        案件を探す
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {reports.map((report) => {
                                        const application = Array.isArray(report.job_applications)
                                            ? report.job_applications[0]
                                            : report.job_applications;
                                        const job = application?.jobs
                                            ? (Array.isArray(application.jobs) ? application.jobs[0] : application.jobs)
                                            : null;

                                        return (
                                            <div
                                                key={report.id}
                                                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-900 text-sm mb-1">
                                                            {job?.title || "案件名不明"}
                                                        </h3>
                                                        <p className="text-xs text-slate-500">
                                                            提出日時: {formatDateTime(report.created_at)}
                                                        </p>
                                                    </div>
                                                    {getStatusBadge(report.status)}
                                                </div>

                                                <div className="space-y-2 text-xs">
                                                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                        <span className="text-slate-600">作業日時</span>
                                                        <span className="text-slate-900 font-medium">
                                                            {formatDateTime(report.work_start_at)} - {formatDateTime(report.work_end_at)}
                                                        </span>
                                                    </div>
                                                    {job && (
                                                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                                                            <span className="text-green-700">報酬金額</span>
                                                            <span className="text-green-900 font-bold">
                                                                ¥{(job.reward_amount || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {report.status === "REJECTED" && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                                        <p className="text-xs text-red-800 font-medium mb-1">差し戻し理由</p>
                                                        <p className="text-xs text-red-700">
                                                            管理者から確認をお願いします。
                                                        </p>
                                                    </div>
                                                )}

                                                {report.report_text && (
                                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                                        <p className="text-xs text-slate-600 line-clamp-2">
                                                            {report.report_text}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
