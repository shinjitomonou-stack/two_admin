import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Calendar, JapaneseYen, Building2 } from "lucide-react";
import { ApplyButton } from "@/components/ApplyButton";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const workerId = cookieStore.get("worker_id")?.value;

    if (!workerId) {
        redirect("/login");
    }

    const supabase = await createClient();

    // Fetch job details
    const { data: job, error } = await supabase
        .from("jobs")
        .select(`
            *,
            clients (
                name
            ),
            job_applications (
                status
            )
        `)
        .eq("id", id)
        .single();

    if (error || !job) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-xl font-bold mb-4">案件が見つかりません</h1>
                    <p className="text-red-500 mb-4 text-sm">{error?.message || "Job not found"}</p>
                    <p className="text-slate-400 mb-4 text-xs">ID: {id}</p>
                    <Link href="/jobs" className="text-blue-600">案件一覧へ戻る</Link>
                </div>
            </div>
        );
    }

    // Calculate capacity
    const maxWorkers = job.max_workers || 1;
    const confirmedCount = job.job_applications?.filter(
        (app: any) => app.status === 'ASSIGNED' || app.status === 'CONFIRMED'
    ).length || 0;
    const remainingSlots = Math.max(0, maxWorkers - confirmedCount);
    const isFull = remainingSlots === 0;

    // Check if already applied
    const { data: existingApplication } = await supabase
        .from("job_applications")
        .select("id, status")
        .eq("job_id", id)
        .eq("worker_id", workerId)
        .single();

    // Check if report exists
    let existingReport = null;
    if (existingApplication) {
        const { data: reportData } = await supabase
            .from("reports")
            .select("id, status, created_at")
            .eq("application_id", existingApplication.id)
            .single();
        existingReport = reportData;
    }

    const startDate = job.is_flexible && job.work_period_start
        ? new Date(job.work_period_start)
        : new Date(job.start_time);
    const endDate = job.is_flexible && job.work_period_end
        ? new Date(job.work_period_end)
        : new Date(job.end_time);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
                    <Link href="/jobs" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <h1 className="font-bold text-lg text-slate-900">案件詳細</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                {/* Job Status Badge */}
                {existingApplication ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <span className="font-medium text-blue-900">
                            {existingApplication.status === 'APPLIED' && '応募済み'}
                            {existingApplication.status === 'ASSIGNED' && 'アサイン済み'}
                            {existingApplication.status === 'CONFIRMED' && '確定'}
                            {existingApplication.status === 'REJECTED' && '不採用'}
                        </span>
                    </div>
                ) : (
                    <div className={`border rounded-lg p-3 text-sm flex items-center justify-between ${isFull ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <span className={`font-medium ${isFull ? 'text-red-900' : 'text-green-900'}`}>
                            {isFull ? '満員御礼' : `募集中 (残り${remainingSlots}枠)`}
                        </span>
                        <span className="text-xs text-slate-500">
                            定員: {maxWorkers}名
                        </span>
                    </div>
                )}

                {/* Report Status Badge */}
                {existingReport && (
                    <div className={`border rounded-lg p-3 text-sm ${existingReport.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                        existingReport.status === 'REJECTED' ? 'bg-red-50 border-red-200' :
                            'bg-amber-50 border-amber-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">
                                {existingReport.status === 'APPROVED' && '日報承認済み'}
                                {existingReport.status === 'REJECTED' && '日報差し戻し'}
                                {existingReport.status === 'SUBMITTED' && '日報確認中'}
                            </span>
                            <span className="text-xs opacity-70">
                                {new Date(existingReport.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                )}

                {/* Main Job Info */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-tight mb-2">
                            {job.title}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Building2 className="w-4 h-4" />
                            <span>{job.clients?.name || "案件元不明"}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                            <div className="text-xs text-slate-500 font-medium">報酬</div>
                            <div className="flex items-center gap-1 font-bold text-slate-900">
                                <JapaneseYen className="w-4 h-4 text-slate-400" />
                                <span>¥{(job.reward_amount || 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                            <div className="text-xs text-slate-500 font-medium">場所</div>
                            <div className="flex items-center gap-1 font-bold text-slate-900 truncate">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span className="truncate">{job.address_text || "未設定"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">日時</div>
                                <div className="text-sm text-slate-600 mt-0.5">
                                    {job.is_flexible ? (
                                        <>
                                            <div>{startDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} 〜 {endDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}</div>
                                            <div className="text-xs text-blue-600 mt-1">期間内で自由に実施可能</div>
                                        </>
                                    ) : (
                                        <>
                                            <div>{startDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</div>
                                            <div>{startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 〜 {endDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {job.schedule_notes && (
                            <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800">
                                <p className="font-bold text-xs mb-1">日時に関する備考</p>
                                {job.schedule_notes}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900">勤務地</div>
                                <div className="text-sm text-slate-600 mt-0.5">
                                    {job.address_text || "未設定"}
                                </div>
                                {/* Map placeholder */}
                                <div className="mt-2 h-32 bg-slate-100 rounded-lg w-full flex items-center justify-center text-slate-400 text-xs">
                                    地図が表示されます
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg text-slate-900">業務内容</h3>
                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {job.description || "詳細はありません。"}
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Action */}
            {!existingApplication && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-8 safe-area-bottom">
                    <div className="max-w-md mx-auto">
                        <ApplyButton
                            jobId={id}
                            disabled={isFull}
                            disabledLabel="定員に達しました"
                        />
                    </div>
                </div>
            )}

            {existingApplication && (existingApplication.status === 'ASSIGNED' || existingApplication.status === 'CONFIRMED') && (!existingReport || existingReport.status === 'REJECTED') && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 pb-8">
                    <div className="max-w-md mx-auto">
                        <Link
                            href={`/jobs/${id}/report`}
                            className="block w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-center"
                        >
                            {existingReport?.status === 'REJECTED' ? '作業報告を再提出する' : '作業報告を提出する'}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
