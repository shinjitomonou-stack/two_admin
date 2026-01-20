"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, DollarSign, CheckCircle2, Clock, Building2, User, Globe, Monitor, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updatePaymentNoticeStatus, sendPaymentNoticeNotification, completePayment } from "@/app/actions/payment";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "下書き",
    ISSUED: "発行済",
    APPROVED: "承認済",
    PAID: "支払済",
};

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    ISSUED: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    PAID: "bg-purple-100 text-purple-700",
};

export default function PaymentNoticeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [notice, setNotice] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchNotice();
    }, [id]);

    const fetchNotice = async () => {
        setIsLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
            .from("payment_notices")
            .select(`
                *,
                worker:workers(full_name, line_user_id)
            `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching notice:", error);
            toast.error("データの取得に失敗しました");
        } else {
            setNotice(data);
        }
        setIsLoading(false);
    };

    const handleStatusUpdate = async (newStatus: string) => {
        setIsProcessing(true);
        try {
            const result = await updatePaymentNoticeStatus(id, newStatus);
            if (result.success) {
                toast.success(`ステータスを${STATUS_LABELS[newStatus]}に更新しました`);
                fetchNotice();
            } else {
                toast.error("更新に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendNotification = async () => {
        setIsProcessing(true);
        try {
            const result = await sendPaymentNoticeNotification(id);
            if (result.success) {
                toast.success("LINE通知を送信しました");
                fetchNotice();
            } else {
                toast.error(result.message || "通知の送信に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCompletePayment = async () => {
        setIsProcessing(true);
        try {
            const result = await completePayment(id);
            if (result.success) {
                toast.success("支払処理が完了し、LINE通知を送信しました");
                fetchNotice();
            } else {
                toast.error(result.error || "支払処理に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </AdminLayout>
        );
    }

    if (!notice) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <p className="text-slate-500">支払通知書が見つかりません</p>
                    <Link href="/workers/payment/notices" className="text-blue-600 hover:underline mt-4 inline-block">
                        一覧に戻る
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    const jobs = (notice.job_details as any[]) || [];

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/workers/payment/notices" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">支払通知書 詳細</h2>
                        <p className="text-muted-foreground">
                            {notice.month} - {notice.worker?.full_name}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Worker Info */}
                        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-slate-500" />
                                ワーカー情報
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">氏名</span>
                                    <span className="font-medium">{notice.worker?.full_name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">LINE連携</span>
                                    <span className={cn("text-sm font-medium", notice.worker?.line_user_id ? "text-green-600" : "text-slate-400")}>
                                        {notice.worker?.line_user_id ? "連携済み" : "未連携"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-slate-500" />
                                支払サマリー
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">税抜金額</span>
                                    <span className="font-medium">¥{Math.round(notice.total_amount).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">消費税 (10%)</span>
                                    <span className="font-medium">¥{Math.round(notice.tax_amount).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className="text-base font-bold">合計金額（税込）</span>
                                    <span className="text-xl font-bold text-blue-600">¥{Math.round(notice.total_amount + notice.tax_amount).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Job Details */}
                        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-slate-500" />
                                対象案件内訳
                            </h3>
                            <div className="space-y-3">
                                {jobs.map((job, index) => (
                                    <div key={index} className="border border-slate-100 rounded-lg p-4">
                                        <div className="font-bold text-slate-900 mb-2">{job.job_title}</div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(job.work_date).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                                            </div>
                                            <div className="font-bold text-slate-900">
                                                ¥{Math.round(job.amount).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Status & Actions */}
                    <div className="space-y-6">
                        {/* Status */}
                        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                            <h3 className="font-bold text-lg mb-4">ステータス</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-center">
                                    <span className={cn("inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold", STATUS_COLORS[notice.status])}>
                                        {STATUS_LABELS[notice.status]}
                                    </span>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    {notice.issued_at && (
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">発行日時</div>
                                            <div className="text-sm font-medium">{new Date(notice.issued_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</div>
                                        </div>
                                    )}
                                    {notice.approved_at && (
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">承認日時</div>
                                            <div className="text-sm font-medium">{new Date(notice.approved_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</div>
                                        </div>
                                    )}
                                    {notice.paid_at && (
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">支払日時</div>
                                            <div className="text-sm font-medium">{new Date(notice.paid_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</div>
                                        </div>
                                    )}
                                    {notice.notification_sent_at && (
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">通知送信日時</div>
                                            <div className="text-sm font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                                {new Date(notice.notification_sent_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Approval Audit Trail */}
                        {notice.approved_at && (notice.approved_ip_address || notice.approved_user_agent) && (
                            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                                <h3 className="font-bold text-sm mb-4 text-blue-900">承認証跡</h3>
                                <div className="space-y-3">
                                    {notice.approved_ip_address && (
                                        <div>
                                            <div className="text-xs text-blue-700 mb-1 flex items-center gap-1">
                                                <Globe className="w-3 h-3" />
                                                IPアドレス
                                            </div>
                                            <div className="text-sm font-mono text-blue-900 bg-white/50 px-2 py-1 rounded">
                                                {notice.approved_ip_address}
                                            </div>
                                        </div>
                                    )}
                                    {notice.approved_user_agent && (
                                        <div>
                                            <div className="text-xs text-blue-700 mb-1 flex items-center gap-1">
                                                <Monitor className="w-3 h-3" />
                                                ユーザーエージェント
                                            </div>
                                            <div className="text-xs font-mono text-blue-900 bg-white/50 px-2 py-1 rounded break-all">
                                                {notice.approved_user_agent}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                            <h3 className="font-bold text-lg mb-4">操作</h3>
                            <div className="space-y-2">
                                {notice.status === 'DRAFT' && (
                                    <button
                                        onClick={() => handleStatusUpdate('ISSUED')}
                                        disabled={isProcessing}
                                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                        発行する
                                    </button>
                                )}
                                {notice.status === 'ISSUED' && (
                                    <button
                                        onClick={handleSendNotification}
                                        disabled={isProcessing}
                                        className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                        通知を再送
                                    </button>
                                )}
                                {notice.status === 'APPROVED' && (
                                    <button
                                        onClick={handleCompletePayment}
                                        disabled={isProcessing}
                                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                        支払完了にする
                                    </button>
                                )}
                                {notice.status === 'PAID' && (
                                    <div className="text-center text-sm text-slate-500 py-2">
                                        支払処理が完了しています
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
