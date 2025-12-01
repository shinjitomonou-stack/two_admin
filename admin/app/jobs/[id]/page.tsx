import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, MapPin, Calendar, Clock, Users, DollarSign, Building2, Edit, Banknote } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatTime } from "@/lib/utils";
import { ApplicationRow } from "@/components/ApplicationRow";
import { ManualAssignmentButton } from "@/components/ManualAssignmentButton";

const STATUS_STYLES = {
    APPLIED: "bg-blue-100 text-blue-700",
    ASSIGNED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700",
    CONFIRMED: "bg-purple-100 text-purple-700",
};

const STATUS_LABELS = {
    APPLIED: "応募中",
    ASSIGNED: "採用",
    REJECTED: "不採用",
    CANCELLED: "辞退",
    CONFIRMED: "契約済",
};

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch Job Details
    const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("*, clients(name)")
        .eq("id", id)
        .single();

    if (jobError || !job) {
        notFound();
    }

    // Fetch Applications for this Job
    const { data: applications, error: appError } = await supabase
        .from("job_applications")
        .select("*, workers(*), reports(id, status)")
        .eq("job_id", id)
        .order("created_at", { ascending: false });

    return (
        <AdminLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/jobs"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                                {job.status}
                            </span>
                            <span>ID: {job.id}</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Left Column: Job Info */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-lg">案件詳細</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">クライアント</label>
                                    {/* @ts-ignore */}
                                    <div className="text-sm font-medium">{job.clients?.name}</div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">場所</label>
                                    <div className="flex items-start gap-2 text-sm mt-1">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                        <span>{job.address_text || "未設定"}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">日時</label>
                                    {job.is_flexible ? (
                                        <div className="flex items-center gap-2 text-sm mt-1">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>
                                                {formatDate(job.work_period_start)} 〜 {formatDate(job.work_period_end)}
                                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">期間指定</span>
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span>{formatDate(job.start_time)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                <span>
                                                    {formatTime(job.start_time)} - {formatTime(job.end_time)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">報酬</label>
                                    <div className="flex items-center gap-2 text-sm mt-1 font-bold text-slate-900">
                                        <DollarSign className="w-4 h-4 text-slate-400" />
                                        ¥{job.reward_amount.toLocaleString()}
                                    </div>
                                </div>

                                {job.billing_amount && (
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">請求金額</label>
                                        <div className="flex items-center gap-2 text-sm mt-1 font-bold text-slate-900">
                                            <Banknote className="w-4 h-4 text-slate-400" />
                                            ¥{job.billing_amount.toLocaleString()}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">業務内容</label>
                                    <p className="text-sm mt-1 text-slate-600 whitespace-pre-wrap">
                                        {job.description || "詳細なし"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Applications */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-border flex items-center justify-between">
                                <h3 className="font-semibold text-lg">応募者一覧 ({applications?.length || 0})</h3>
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-muted-foreground">
                                        募集人数: {job.max_workers}名
                                    </div>
                                    <ManualAssignmentButton
                                        jobId={id}
                                        existingWorkerIds={applications?.map(app => app.workers?.id).filter(Boolean) || []}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-border text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">ワーカー</th>
                                            <th className="px-6 py-3 font-medium">ステータス</th>
                                            <th className="px-6 py-3 font-medium">応募日時</th>
                                            <th className="px-6 py-3 font-medium text-right">アクション</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {applications?.map((app) => (
                                            // @ts-ignore
                                            <ApplicationRow key={app.id} app={app} />
                                        ))}
                                        {(!applications || applications.length === 0) && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                    まだ応募はありません。
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
