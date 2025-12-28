import AdminLayout from "@/components/layout/AdminLayout";
import { ShieldCheck, ShieldAlert, Eye, Edit, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ServerPagination from "@/components/ui/ServerPagination";
import WorkerFilters from "@/components/WorkerFilters";

const ITEMS_PER_PAGE = 100;

// Helper to calculate age from birth_date
function calculateAge(birthDateStr: string | null) {
    if (!birthDateStr) return "不明";
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return `${age}歳`;
}

// Helper to truncate address
function formatShortAddress(postalCode: string | null, address: string | null) {
    if (!address) return "-";
    // Get city part (simplified: up to the first '市' or '郡' if possible, otherwise first few chars)
    const match = address.match(/.*?[市郡]/);
    const short = match ? match[0] : address.substring(0, 10);
    return (
        <div className="text-xs">
            {postalCode && <div className="text-slate-400">〒{postalCode}</div>}
            <div className="line-clamp-1">{short}</div>
        </div>
    );
}

export default async function WorkersPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; query?: string }>
}) {
    const params = await searchParams;
    const currentPage = Number(params.page) || 1;
    const search = params.query || "";

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const supabase = await createClient();

    // Build query for total count
    let countQuery = supabase
        .from("workers")
        .select("*", { count: "exact", head: true });

    if (search) {
        countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,worker_number.ilike.%${search}%,tags.cs.{${search}}`);
    }

    const { count } = await countQuery;

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

    // Build query for paginated data
    let dataQuery = supabase
        .from("workers")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

    if (search) {
        dataQuery = dataQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,worker_number.ilike.%${search}%,tags.cs.{${search}}`);
    }

    const { data: workers, error } = await dataQuery;

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
                    <Link
                        href="/workers/new"
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規登録
                    </Link>
                </div>

                {/* Filters */}
                <WorkerFilters />

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                    {count || 0}件のワーカー
                    {search && (
                        <span className="ml-2 text-muted-foreground">
                            「${search}」の検索結果
                        </span>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-[calc(100vh-20rem)]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-medium">管理番号</th>
                                    <th className="px-6 py-3 font-medium">氏名 / フリガナ</th>
                                    <th className="px-6 py-3 font-medium">基本情報</th>
                                    <th className="px-6 py-3 font-medium">連絡先</th>
                                    <th className="px-6 py-3 font-medium">住所</th>
                                    <th className="px-6 py-3 font-medium">タグ</th>
                                    <th className="px-6 py-3 font-medium">本人確認</th>
                                    <th className="px-6 py-3 font-medium">登録日</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {workersWithVerification?.map((worker) => (
                                    <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                {worker.worker_number || "-"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{worker.full_name}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase opacity-70 leading-none mt-0.5">
                                                {worker.name_kana || "-"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${worker.gender === 'male' ? 'bg-blue-50 text-blue-600' :
                                                    worker.gender === 'female' ? 'bg-pink-50 text-pink-600' :
                                                        'bg-slate-50 text-slate-600'
                                                    }`}>
                                                    {worker.gender === 'male' ? '男' : worker.gender === 'female' ? '女' : '不明'}
                                                </span>
                                                <span className="text-slate-900 font-medium">
                                                    {calculateAge(worker.birth_date)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-medium text-slate-900">{worker.email}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{worker.phone || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {formatShortAddress(worker.postal_code, worker.address)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {worker.tags && worker.tags.length > 0 ? (
                                                    worker.tags.map((tag: string, i: number) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 text-[10px]">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {worker.email_confirmed_at ? (
                                                <div className="flex items-center gap-1 text-green-600 text-[11px] font-bold">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    OK
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-orange-500 text-[11px] font-bold">
                                                    <ShieldAlert className="w-3.5 h-3.5" />
                                                    待機
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                                            {formatDate(worker.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/workers/${worker.id}`}
                                                    className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-blue-600"
                                                    title="詳細"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/workers/${worker.id}/edit`}
                                                    className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-green-600"
                                                    title="編集"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!workersWithVerification || workersWithVerification.length === 0) && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                                            {search ? "検索条件に一致するワーカーが見つかりませんでした。" : "ワーカーがまだ登録されていません。"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <ServerPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            baseUrl="/workers"
                            searchParams={params}
                        />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
