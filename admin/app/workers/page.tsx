import AdminLayout from "@/components/layout/AdminLayout";
import { Search, Filter, MoreHorizontal, ShieldCheck, ShieldAlert, Eye, Edit, Plus, Mail, Phone, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ServerPagination from "@/components/ui/ServerPagination";

const ITEMS_PER_PAGE = 100;

export default async function WorkersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const { page } = await searchParams;
    const currentPage = Number(page) || 1;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const supabase = await createClient();

    // Get total count
    const { count } = await supabase
        .from("workers")
        .select("*", { count: "exact", head: true });

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

    // Get paginated data
    const { data: workers, error } = await supabase
        .from("workers")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching workers:", error);
    }

    // Fetch email verification status for each worker
    const workersWithVerification = await Promise.all(
        (workers || []).map(async (worker) => {
            const { data: { user } } = await supabase.auth.admin.getUserById(worker.id);
            return {
                ...worker,
                email_confirmed_at: user?.email_confirmed_at || null,
            };
        })
    );

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">ワーカー管理</h2>
                        <p className="text-muted-foreground">
                            登録ワーカーの確認・ステータス管理を行います。
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="名前、メールアドレスで検索..."
                            className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-input rounded-md hover:bg-slate-50 text-sm font-medium">
                        <Filter className="w-4 h-4" />
                        フィルター
                    </button>
                </div>

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                    {count || 0}件のワーカー
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-[calc(100vh-20rem)]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-medium">氏名 / メール</th>
                                    <th className="px-6 py-3 font-medium">ランク</th>
                                    <th className="px-6 py-3 font-medium">本人確認</th>
                                    <th className="px-6 py-3 font-medium">登録日</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {workersWithVerification?.map((worker) => (
                                    <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{worker.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{worker.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                {worker.rank || 'Bronze'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {worker.email_confirmed_at ? (
                                                <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    確認済み
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-orange-500 text-xs font-medium">
                                                    <ShieldAlert className="w-4 h-4" />
                                                    未確認
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {formatDate(worker.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/workers/${worker.id}`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600"
                                                    title="詳細"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/workers/${worker.id}/edit`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-green-600"
                                                    title="編集"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {
                                    (!workersWithVerification || workersWithVerification.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                                ワーカーがまだ登録されていません。
                                            </td>
                                        </tr>
                                    )
                                }
                            </tbody >
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <ServerPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            baseUrl="/workers"
                        />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
