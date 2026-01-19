import AdminLayout from "@/components/layout/AdminLayout";
import { Building2, Plus, Eye, Edit } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import ServerPagination from "@/components/ui/ServerPagination";
import SearchInput from "@/components/ui/SearchInput";

const ITEMS_PER_PAGE = 100;

export default async function ClientsPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; query?: string }>
}) {
    const params = await searchParams;
    const currentPage = Number(params.page) || 1;
    const search = params.query || "";
    // @ts-ignore
    const isPartnerContext = params.trading_type === "PLACING" || params.type === "PLACING";
    const label = isPartnerContext ? "パートナー" : "クライアント";

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const supabase = await createClient();

    // Build query for total count
    let countQuery = supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

    if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,client_number.ilike.%${search}%`);
    }

    if (isPartnerContext) {
        countQuery = countQuery.in("trading_role", ["PARTNER", "BOTH"]);
    } else {
        // NULLの場合もクライアント（RECEIVING）として扱う
        countQuery = countQuery.or('trading_role.in.("CLIENT","BOTH"),trading_role.is.null');
    }

    const { count, error: countError } = await countQuery;

    // Fallback: If trading_role doesn't exist yet, retry without the filter
    let finalCount = count;
    if (countError && countError.message.includes('column "trading_role" does not exist')) {
        const { count: fallbackCount } = await supabase
            .from("clients")
            .select("*", { count: "exact", head: true });
        finalCount = fallbackCount;
    }

    const totalPages = Math.ceil((finalCount || 0) / ITEMS_PER_PAGE);

    // Build query for paginated data
    let dataQuery = supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

    if (search) {
        dataQuery = dataQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,client_number.ilike.%${search}%`);
    }

    if (isPartnerContext) {
        dataQuery = dataQuery.in("trading_role", ["PARTNER", "BOTH"]);
    } else {
        // NULLの場合もクライアント（RECEIVING）として扱う
        dataQuery = dataQuery.or('trading_role.in.("CLIENT","BOTH"),trading_role.is.null');
    }

    let { data: clients, error } = await dataQuery;

    // Fallback: If trading_role doesn't exist yet, retry without the filter
    if (error && error.message.includes('column "trading_role" does not exist')) {
        const fallbackQuery = supabase
            .from("clients")
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, to);
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        clients = fallbackData;
        error = fallbackError;
    }

    if (error) {
        console.error("Error fetching clients:", error);
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{label}管理</h2>
                        <p className="text-muted-foreground">
                            案件の{isPartnerContext ? "外注先となるパートナー" : "発注元となるクライアント"}企業を管理します。
                        </p>
                    </div>
                    <Link
                        href={`/clients/create?returnTo=${encodeURIComponent(`/clients?trading_type=${isPartnerContext ? "PLACING" : "RECEIVING"}`)}&type=${isPartnerContext ? "PLACING" : "RECEIVING"}`}
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規{label}登録
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                    <SearchInput
                        placeholder="クライアント/パートナー名で検索..."
                        className="flex-1 max-w-sm"
                    />
                </div>

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                    {count || 0}件の{label}
                    {search && (
                        <span className="ml-2 text-muted-foreground">
                            「{search}」の検索結果
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
                                    <th className="px-6 py-3 font-medium">会社名</th>
                                    <th className="px-6 py-3 font-medium">連絡先</th>
                                    <th className="px-6 py-3 font-medium">住所</th>
                                    <th className="px-6 py-3 font-medium">登録日</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {clients?.map((client) => (
                                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                {client.client_number || "-"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg">
                                                    <Building2 className="w-5 h-5 text-slate-500" />
                                                </div>
                                                <div className="font-medium text-slate-900">{client.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900">{client.email}</div>
                                            <div className="text-xs text-muted-foreground">{client.phone || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 truncate max-w-xs">
                                            {client.address || "-"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-500">
                                                {formatDate(client.created_at)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/clients/${client.id}?trading_type=${isPartnerContext ? "PLACING" : "RECEIVING"}`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600"
                                                    title="詳細"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/clients/${client.id}/edit?returnTo=${encodeURIComponent(`/clients?trading_type=${isPartnerContext ? "PLACING" : "RECEIVING"}`)}`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-green-600"
                                                    title="編集"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!clients || clients.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            {search ? "検索条件に一致する組織が見つかりませんでした。" : "組織がまだ登録されていません。"}
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
                            baseUrl="/clients"
                            searchParams={params}
                        />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
