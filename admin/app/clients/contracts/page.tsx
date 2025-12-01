import AdminLayout from "@/components/layout/AdminLayout";
import { Search, Filter, Plus, FileText, Calendar, Building2, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function ClientContractsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams;
    const currentTab = tab || 'basic';

    const supabase = await createClient();

    // Fetch contracts based on tab
    let contracts: any[] = [];

    if (currentTab === 'basic' || currentTab === 'nda') {
        const { data } = await supabase
            .from("client_contracts")
            .select(`
                *,
                clients(name)
            `)
            .eq("contract_type", currentTab.toUpperCase())
            .order("created_at", { ascending: false });
        contracts = data || [];
    } else if (currentTab === 'individual') {
        const { data } = await supabase
            .from("client_job_contracts")
            .select(`
                *,
                clients(name),
                jobs(title)
            `)
            .order("created_at", { ascending: false });
        contracts = data || [];
    }

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
            PENDING: "承認待ち",
            ACTIVE: "有効",
            EXPIRED: "期限切れ",
            TERMINATED: "解約",
            COMPLETED: "完了",
            CANCELLED: "キャンセル",
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
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="クライアント名、契約タイトルで検索..."
                            className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-input rounded-md hover:bg-slate-50 text-sm font-medium">
                        <Filter className="w-4 h-4" />
                        フィルター
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">クライアント</th>
                                    <th className="px-6 py-3 font-medium">契約タイトル</th>
                                    {currentTab === 'individual' && <th className="px-6 py-3 font-medium">案件</th>}
                                    {(currentTab === 'basic' || currentTab === 'nda') && <th className="px-6 py-3 font-medium">有効期間</th>}
                                    {(currentTab === 'basic' || currentTab === 'nda') && <th className="px-6 py-3 font-medium">月額金額</th>}
                                    {currentTab === 'individual' && <th className="px-6 py-3 font-medium">契約金額</th>}
                                    <th className="px-6 py-3 font-medium">ステータス</th>
                                    <th className="px-6 py-3 font-medium">締結日</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {contracts.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
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
                                        {(currentTab === 'basic' || currentTab === 'nda') && (
                                            <td className="px-6 py-4 text-slate-500">
                                                <div className="flex items-center gap-1 text-xs">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(contract.start_date)} 〜 {contract.end_date ? formatDate(contract.end_date) : '無期限'}
                                                </div>
                                            </td>
                                        )}
                                        {(currentTab === 'basic' || currentTab === 'nda') && (
                                            <td className="px-6 py-4 text-slate-500">
                                                {contract.monthly_amount ? `¥${contract.monthly_amount.toLocaleString()}` : '-'}
                                            </td>
                                        )}
                                        {currentTab === 'individual' && (
                                            <td className="px-6 py-4 text-slate-500">
                                                ¥{contract.contract_amount?.toLocaleString() || '0'}
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            {getStatusBadge(contract.status)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {formatDate(contract.signed_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/clients/contracts/${currentTab}/${contract.id}`}
                                                className="text-blue-600 hover:underline text-sm font-medium"
                                            >
                                                詳細
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {contracts.length === 0 && (
                                    <tr>
                                        <td colSpan={currentTab === 'individual' ? 7 : 8} className="px-6 py-8 text-center text-muted-foreground">
                                            契約がまだ登録されていません。
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
