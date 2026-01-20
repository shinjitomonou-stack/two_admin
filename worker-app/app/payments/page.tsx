import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, FileText, CheckCircle2, Clock, Inbox } from "lucide-react";
import BackButton from "@/components/BackButton";

const STATUS_LABELS: Record<string, string> = {
    ISSUED: "確認待ち",
    APPROVED: "承認済",
    PAID: "支払済",
};

const STATUS_COLORS: Record<string, string> = {
    ISSUED: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    PAID: "bg-purple-100 text-purple-700",
};

export default async function PaymentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div className="p-4 text-center">ログインしてください</div>;

    const { data: notices } = await supabase
        .from("payment_notices")
        .select("*")
        .eq("worker_id", user.id)
        .neq("status", "DRAFT")
        .order("month", { ascending: false });

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10 flex items-center gap-4">
                <BackButton fallbackHref="/" variant="chevron" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 ml-0" />
                <div>
                    <h1 className="text-lg font-bold text-slate-900">支払明細</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        月ごとの支払金額を確認・承認できます。
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {notices && notices.length > 0 ? (
                    notices.map((notice) => (
                        <Link
                            key={notice.id}
                            href={`/payments/${notice.id}`}
                            className="block bg-white rounded-xl border border-slate-200 p-4 active:bg-slate-50 transition-colors shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                    <span className="font-bold text-slate-900">{notice.month}分 支払通知書</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[notice.status]}`}>
                                    {STATUS_LABELS[notice.status]}
                                </span>
                            </div>
                            <div className="flex items-end justify-between">
                                <div className="space-y-1">
                                    <div className="text-xs text-slate-500">合計(税込)</div>
                                    <div className="text-xl font-bold text-slate-900">
                                        ¥{Math.round(notice.total_amount + notice.tax_amount).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-blue-600 text-xs font-medium">
                                    詳細を確認
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                        <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                        <p className="text-slate-500 text-sm">支払通知書はまだありません。</p>
                    </div>
                )}
            </div>
        </div>
    );
}
