import AdminLayout from "@/components/layout/AdminLayout";
import { Search, Filter, Plus, FileText, Calendar, Building2, CheckCircle, Clock, XCircle, Eye, Edit } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import ServerPagination from "@/components/ui/ServerPagination";
import ClientContractFilters from "@/components/ClientContractFilters";

const ITEMS_PER_PAGE = 100;

export default async function ClientContractsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; status?: string; trading_type?: string; search?: string }> }) {
    const { tab, page, status, trading_type, search } = await searchParams;
    const currentTab = tab || 'basic';
    const currentPage = Number(page) || 1;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const supabase = await createClient();

    // Fetch contracts based on tab
    let contracts: any[] = [];
    let totalPages = 0;

    const table = currentTab === 'individual' ? 'client_job_contracts' : 'client_contracts';

    let query = supabase
        .from(table)
        .select(`
            *,
            clients(name)${currentTab === 'individual' ? ', jobs!job_id(title)' : ''}
        `, { count: "exact" });

    if (currentTab === 'basic' || currentTab === 'nda') {
        query = query.eq("contract_type", currentTab.toUpperCase());
    }

    if (status) {
        query = query.eq("status", status);
    }

    if (trading_type) {
        query = query.eq("trading_type", trading_type);
    }

    if (search) {
        // Simple search on title. For complex client name search, might need a view or join filter.
        query = query.ilike("title", `%${search}%`);
    }

    const { data, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    contracts = data || [];
    totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);

    const getStatusBadge = (status: string) => {
        const styles = {
            DRAFT: "bg-slate-100 text-slate-700",
            PENDING: "bg-orange-100 text-orange-700",
            ACTIVE: "bg-green-100 text-green-700",
            EXPIRED: "bg-red-100 text-red-700",
            TERMINATED: "bg-red-100 text-red-700",
            COMPLETED: "bg-blue-100 text-blue-700",
            CANCELLED: "bg-slate-100 text-slate-700",
        };
        const labels = {
            DRAFT: "下書き",
            PENDING: "未締結 (申請中)",
            ACTIVE: "締結済",
            EXPIRED: "期限切れ",
            TERMINATED: "解約",
            COMPLETED: "完了",
            CANCELLED: "取消",
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
                {labels[status as keyof typeof labels]}
            </span>
        );
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">クライアント契約管理</h2>
                        <p className="text-muted-foreground">
                            クライアントとの契約を管理します。
                        </p>
                    </div>
                    <Link
                        href="/clients/contracts/create"
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規契約作成
                    </Link>
                </div>

                {/* Tabs */}
                <div className="border-b border-border">
                    <div className="flex gap-8">
                        <Link
                            href="/clients/contracts?tab=basic"
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${currentTab === 'basic'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            基本契約
                        </Link>
                        <Link
                            href="/clients/contracts?tab=nda"
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${currentTab === 'nda'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            NDA
                        </Link>
                        <Link
                            href="/clients/contracts?tab=individual"
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${currentTab === 'individual'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            個別契約
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <ClientContractFilters />

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                    {contracts.length}件の契約
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-[calc(100vh-20rem)]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-center">種別</th>
                                    <th className="px-6 py-3 font-medium">クライアント</th>
                                    <th className="px-6 py-3 font-medium">契約タイトル</th>
                                    {currentTab === 'individual' && <th className="px-6 py-3 font-medium">案件</th>}
                                    <th className="px-6 py-3 font-medium">契約期間</th>
                                    {currentTab === 'individual' && <th className="px-6 py-3 font-medium text-center">自動更新</th>}
                                    {(currentTab === 'basic' || currentTab === 'nda') && <th className="px-6 py-3 font-medium text-right">月額金額</th>}
                                    {currentTab === 'individual' && <th className="px-6 py-3 font-medium text-right">契約金額</th>}
                                    <th className="px-6 py-3 font-medium text-center">ステータス</th>
                                    <th className="px-6 py-3 font-medium text-center">締結日</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {contracts.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${contract.trading_type === 'RECEIVING' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {contract.trading_type === 'RECEIVING' ? '受注' : '発注'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                {/* @ts-ignore */}
                                                <span className="font-medium">{contract.clients?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{contract.title}</div>
                                        </td>
                                        {currentTab === 'individual' && (
                                            <td className="px-6 py-4 text-slate-500">
                                                {/* @ts-ignore */}
                                                {contract.jobs?.title || '-'}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-1 text-xs">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(contract.start_date)} 〜 {contract.end_date ? formatDate(contract.end_date) : '無期限'}
                                            </div>
                                        </td>
                                        {currentTab === 'individual' && (
                                            <td className="px-6 py-4 text-center">
                                                {contract.is_auto_renew ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600">
                                                        あり
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                        )}
                                        {(currentTab === 'basic' || currentTab === 'nda') && (
                                            <td className="px-6 py-4 text-slate-500 text-right">
                                                {contract.monthly_amount ? `¥${contract.monthly_amount.toLocaleString()}` : '-'}
                                            </td>
                                        )}
                                        {currentTab === 'individual' && (
                                            <td className="px-6 py-4 text-slate-500 text-right">
                                                <div className="font-medium text-slate-900">
                                                    ¥{contract.contract_amount?.toLocaleString() || '0'}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                                                    {contract.billing_cycle === 'ONCE' ? '都度' :
                                                        contract.billing_cycle === 'MONTHLY' ? '月次' :
                                                            contract.billing_cycle === 'QUARTERLY' ? '四半期' :
                                                                contract.billing_cycle === 'YEARLY' ? '年次' : '不明'}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(contract.status)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-center">
                                            {formatDate(contract.signed_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/clients/contracts/${currentTab}/${contract.id}`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600"
                                                    title="詳細"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/clients/contracts/${currentTab}/${contract.id}/edit`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-green-600"
                                                    title="編集"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {contracts.length === 0 && (
                                    <tr>
                                        <td colSpan={currentTab === 'individual' ? 9 : 8} className="px-6 py-8 text-center text-muted-foreground">
                                            契約がまだ登録されていません。
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
                            baseUrl={`/clients/contracts?tab=${currentTab}`}
                            searchParams={{ status, trading_type, search }}
                        />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
