"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ChevronLeft, ChevronRight, FileText, Send, CheckCircle2, Clock, Eye, AlertCircle, Loader2, ArrowLeft, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePaymentNoticeStatus, sendPaymentNoticeNotification } from "@/app/actions/payment";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

export default function PaymentNoticesPage() {
    const [notices, setNotices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        fetchNotices();
    }, [selectedMonth]);

    const fetchNotices = async () => {
        setIsLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
            .from("payment_notices")
            .select(`
                *,
                worker:workers(full_name, line_id)
            `)
            .eq("month", selectedMonth)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching notices:", error);
        } else {
            setNotices(data || []);
        }
        setIsLoading(false);
    };

    const handleMoveMonth = (delta: number) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + delta, 1);
        setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        setProcessingIds(prev => new Set(prev).add(id));
        try {
            const result = await updatePaymentNoticeStatus(id, newStatus);
            if (result.success) {
                toast.success(`ステータスを${STATUS_LABELS[newStatus]}に更新しました`);
                fetchNotices();
            } else {
                toast.error("更新に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleSendNotification = async (id: string) => {
        setProcessingIds(prev => new Set(prev).add(id));
        try {
            const result = await sendPaymentNoticeNotification(id);
            if (result.success) {
                toast.success("LINE通知を送信しました");
                fetchNotices();
            } else {
                toast.error(result.message || "通知の送信に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleBulkIssue = async () => {
        const draftNotices = notices.filter(n => n.status === 'DRAFT');
        if (draftNotices.length === 0) return;
        if (!confirm(`${draftNotices.length}件の通知書を発行し、LINE通知を送りますか？`)) return;

        setIsLoading(true);
        let successCount = 0;
        for (const notice of draftNotices) {
            // First update status to ISSUED
            const issueResult = await updatePaymentNoticeStatus(notice.id, "ISSUED");
            if (issueResult.success) {
                // Then send notification
                const notifyResult = await sendPaymentNoticeNotification(notice.id);
                if (notifyResult.success) successCount++;
            }
        }
        toast.success(`${successCount}件の発行と通知が完了しました`);
        fetchNotices();
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/workers/payment" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">支払通知書管理</h2>
                            <p className="text-muted-foreground">
                                発行済みの支払通知書のステータスを管理します。
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border border-input rounded-md overflow-hidden shadow-sm">
                            <button onClick={() => handleMoveMonth(-1)} className="p-2 hover:bg-slate-50 transition-colors border-r border-input">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="px-3 py-2 bg-transparent text-sm focus:outline-none w-[150px]"
                            />
                            <button onClick={() => handleMoveMonth(1)} className="p-2 hover:bg-slate-50 transition-colors border-l border-input">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={handleBulkIssue}
                            disabled={isLoading || !notices.some(n => n.status === 'DRAFT')}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                            一括発行 & 通知
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">ワーカー名</th>
                                    <th className="px-6 py-3 font-medium">対象月</th>
                                    <th className="px-6 py-3 font-medium text-right">合計金額(税込)</th>
                                    <th className="px-6 py-3 font-medium">ステータス</th>
                                    <th className="px-6 py-3 font-medium">通知</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading && notices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            読み込み中...
                                        </td>
                                    </tr>
                                ) : notices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            支払通知書が見つかりません。支払集計画面から作成してください。
                                        </td>
                                    </tr>
                                ) : (
                                    notices.map((notice) => (
                                        <tr key={notice.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium">{notice.worker?.full_name}</td>
                                            <td className="px-6 py-4 text-slate-500">{notice.month}</td>
                                            <td className="px-6 py-4 text-right font-bold">
                                                ¥{Math.round(notice.total_amount + notice.tax_amount).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-bold", STATUS_COLORS[notice.status])}>
                                                    {STATUS_LABELS[notice.status]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {notice.notification_sent_at ? (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        送信済
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">未送信</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Link
                                                    href={`/workers/payment/notices/${notice.id}`}
                                                    className="text-xs text-slate-600 hover:underline font-medium"
                                                >
                                                    詳細
                                                </Link>
                                                {notice.status === 'DRAFT' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(notice.id, 'ISSUED')}
                                                        disabled={processingIds.has(notice.id)}
                                                        className="text-xs text-blue-600 hover:underline font-medium disabled:opacity-50"
                                                    >
                                                        発行
                                                    </button>
                                                )}
                                                {notice.status === 'ISSUED' && (
                                                    <button
                                                        onClick={() => handleSendNotification(notice.id)}
                                                        disabled={processingIds.has(notice.id)}
                                                        className="text-xs text-orange-600 hover:underline font-medium disabled:opacity-50"
                                                    >
                                                        通知再送
                                                    </button>
                                                )}
                                                {notice.status === 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(notice.id, 'PAID')}
                                                        disabled={processingIds.has(notice.id)}
                                                        className="text-xs text-purple-600 hover:underline font-medium disabled:opacity-50"
                                                    >
                                                        支払完了
                                                    </button>
                                                )}
                                                {processingIds.has(notice.id) && <Loader2 className="w-3 h-3 animate-spin inline-block" />}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
