import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, Calendar, DollarSign, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import PaymentApprovalButton from "@/components/PaymentApprovalButton";
import { cn } from "@/lib/utils";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div className="p-4 text-center">ログインしてください</div>;

    const { data: notice } = await supabase
        .from("payment_notices")
        .select("*")
        .eq("id", id)
        .eq("worker_id", user.id)
        .single();

    if (!notice) notFound();

    const jobs = (notice.job_details as any[]) || [];

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10 flex items-center gap-4">
                <Link href="/payments" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <h1 className="text-lg font-bold text-slate-900">支払明細詳細</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-slate-500">{notice.month}分 支払合計</span>
                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            notice.status === 'ISSUED' ? "bg-blue-100 text-blue-700" :
                                notice.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                                    "bg-purple-100 text-purple-700"
                        )}>
                            {notice.status === 'ISSUED' ? "未承認" :
                                notice.status === 'APPROVED' ? "承認済" : "支払完了"}
                        </span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-6">
                        ¥{Math.round(notice.total_amount + notice.tax_amount).toLocaleString()}
                        <span className="text-sm font-normal text-slate-400 ml-2">(税込)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div className="space-y-1">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">税抜金額</div>
                            <div className="text-sm font-semibold text-slate-700">¥{Math.round(notice.total_amount).toLocaleString()}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">消費税(10%)</div>
                            <div className="text-sm font-semibold text-slate-700">¥{Math.round(notice.tax_amount).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Job Breakdown */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 px-1">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        対象案件内訳
                    </h3>
                    <div className="space-y-3">
                        {jobs.map((job, index) => (
                            <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <div className="font-bold text-slate-900 mb-2">{job.job_title}</div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-1 text-slate-500">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(job.work_date).toLocaleDateString('ja-JP')}
                                    </div>
                                    <div className="font-bold text-slate-900">
                                        ¥{Math.round(job.amount).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status-specific Info */}
                {notice.status === 'APPROVED' && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                            <div className="text-sm font-bold text-green-900">確認・承認済み</div>
                            <div className="text-xs text-green-700 mt-0.5">
                                {new Date(notice.approved_at).toLocaleString('ja-JP')} に承認されました。現在は支払処理待ちです。
                            </div>
                        </div>
                    </div>
                )}

                {notice.status === 'PAID' && (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                            <div className="text-sm font-bold text-purple-900">お支払完了</div>
                            <div className="text-xs text-purple-700 mt-0.5">
                                この明細の支払処理は完了しています。
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            {notice.status === 'ISSUED' && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                    <div className="max-w-md mx-auto">
                        <div className="flex items-start gap-2 mb-4 text-[10px] text-slate-500 px-2">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>内容に間違いがないかご確認ください。承認後の変更はできません。</span>
                        </div>
                        <PaymentApprovalButton id={notice.id} />
                    </div>
                </div>
            )}
        </div>
    );
}
