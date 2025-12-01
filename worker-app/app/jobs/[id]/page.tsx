import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Calendar, DollarSign, Building2 } from "lucide-react";
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
                {existingApplication && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <span className="font-medium text-blue-900">
                            {existingApplication.status === 'APPLIED' && '応募済み'}
                            {existingApplication.status === 'ASSIGNED' && 'アサイン済み'}
                            {existingApplication.status === 'CONFIRMED' && '確定'}
                            {existingApplication.status === 'REJECTED' && '不採用'}
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
                            <span className={`font-medium ${existingReport.status === 'APPROVED' ? 'text-green-900' :
                                    existingReport.status === 'REJECTED' ? 'text-red-900' :
                                        'text-amber-900'
                                }`}>
                                {existingReport.status === 'APPROVED' && '✓ 作業報告が承認されました'}
                                {existingReport.status === 'REJECTED' && '⚠ 作業報告が差し戻されました'}
                                {existingReport.status === 'SUBMITTED' && '📝 作業報告を提出済み（確認中）'}
                            </span>
                        </div>
                        {existingReport.status === 'REJECTED' && (
                            <p className="text-xs text-red-700 mt-2">
                                報告を修正して再提出してください。
                            </p>
                        )}
                    </div>
                )}

                {/* Job Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{job.title}</h2>
                            {job.clients && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Building2 className="w-4 h-4" />
                                    <span>{job.clients.name}</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">
                                    {job.is_flexible ? '期間' : '日時'}
                                </label>
                                {job.is_flexible ? (
                                    <>
                                        <div className="flex items-center gap-2 text-sm mt-1">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>{startDate.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</span>
                                        </div>
                                        <div className="text-sm text-slate-500 pl-6">〜</div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>{endDate.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</span>
                                        </div>
                                        <div className="mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded inline-block">
                                            期間内で調整可能
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 text-sm mt-1">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>{startDate.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span>{startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })} - {endDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">報酬</label>
                                <div className="flex items-center gap-2 text-sm mt-1 font-bold text-slate-900">
                                    <DollarSign className="w-4 h-4 text-slate-400" />
                                    ¥{job.reward_amount.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {job.schedule_notes && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <div className="text-amber-600 mt-0.5">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-amber-900 mb-1">日時に関する備考</p>
                                        <p className="text-sm text-amber-800 whitespace-pre-wrap">{job.schedule_notes}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">勤務地</label>
                            <div className="flex items-center gap-2 text-sm mt-1">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                <span>{job.address_text || '未設定'}</span>
                            </div>
                        </div>

                        {job.description && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">詳細</label>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
                            </div>
                        )}
                    </div>

                    {!existingApplication && job.status === 'OPEN' && (
                        <div className="p-6 border-t border-slate-100 bg-slate-50">
                            <ApplyButton jobId={id} />
                        </div>
                    )}
                </div>

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
        </div>
    );
}
