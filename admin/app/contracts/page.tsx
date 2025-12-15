import AdminLayout from "@/components/layout/AdminLayout";
import { Search, Filter, FileText, Download, Eye, CheckCircle, XCircle, Clock, Plus, FileSignature, Building2, User } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams;
    const currentTab = tab || 'basic';
    const supabase = await createClient();

    let basicContracts = [];
    let individualContracts = [];

    if (currentTab === 'basic') {
        const { data, error } = await supabase
            .from("worker_basic_contracts")
            .select("*, workers(full_name, email), contract_templates(title, version)")
            .order("signed_at", { ascending: false });
        if (!error) basicContracts = data || [];
    } else {
        // For individual contracts, we need to join:
        // job_individual_contracts -> workers (directly)
        // job_individual_contracts -> job_applications (optional) -> jobs -> clients
        const { data, error } = await supabase
            .from("job_individual_contracts")
            .select(`
                *,
                contract_templates(title, version),
                worker:workers(full_name, email),
                job_applications(
                    workers(full_name, email),
                    jobs(
                        title,
                        clients(name)
                    )
                )
            `)
            .order("signed_at", { ascending: false });

        if (!error) individualContracts = data || [];
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">契約管理</h2>
                        <p className="text-muted-foreground">
                            締結済みの契約書を確認・管理します。
                        </p>
                    </div>
                    <Link
                        href="/contracts/create"
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規契約登録
                    </Link>
                </div>

                {/* Tabs */}
                <div className="border-b border-border">
                    <div className="flex gap-8">
                        <Link
                            href="/contracts?tab=basic"
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${currentTab === 'basic'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            基本契約
                        </Link>
                        <Link
                            href="/contracts?tab=individual"
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
                            placeholder="ワーカー名、案件名で検索..."
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
                                    <th className="px-6 py-3 font-medium">契約書名</th>
                                    <th className="px-6 py-3 font-medium">ワーカー</th>
                                    {currentTab === 'individual' && (
                                        <th className="px-6 py-3 font-medium">案件 / クライアント</th>
                                    )}
                                    <th className="px-6 py-3 font-medium">ステータス</th>
                                    <th className="px-6 py-3 font-medium">締結日時</th>
                                    <th className="px-6 py-3 font-medium text-right">詳細</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {currentTab === 'basic' ? (
                                    // Basic Contracts List
                                    basicContracts.length > 0 ? basicContracts.map((contract) => (
                                        <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileSignature className="w-4 h-4 text-blue-500" />
                                                    <div>
                                                        {/* @ts-ignore */}
                                                        <div className="font-medium">{contract.contract_templates?.title}</div>
                                                        {/* @ts-ignore */}
                                                        <div className="text-xs text-muted-foreground">Ver. {contract.contract_templates?.version}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {/* @ts-ignore */}
                                                <div className="font-medium text-slate-900">{contract.workers?.full_name}</div>
                                                {/* @ts-ignore */}
                                                <div className="text-xs text-muted-foreground">{contract.workers?.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline - flex items - center px - 2.5 py - 0.5 rounded - full text - xs font - medium ${contract.status === 'SIGNED' ? 'bg-green-100 text-green-800' :
                                                    contract.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    } `}>
                                                    {contract.status === 'SIGNED' ? '締結済み' :
                                                        contract.status === 'REJECTED' ? '却下' :
                                                            '未締結 (依頼中)'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {contract.signed_at ? new Date(contract.signed_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/contracts/basic/${contract.id}`}
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors font-medium"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    確認
                                                </Link>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                契約書データがありません。
                                            </td>
                                        </tr>
                                    )
                                ) : (
                                    // Individual Contracts List
                                    individualContracts.length > 0 ? individualContracts.map((contract) => {
                                        // @ts-ignore
                                        const worker = contract.worker || contract.job_applications?.workers;
                                        // @ts-ignore
                                        const job = contract.job_applications?.jobs;

                                        return (
                                            <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileSignature className="w-4 h-4 text-purple-500" />
                                                        <div>
                                                            {/* @ts-ignore */}
                                                            <div className="font-medium">{contract.contract_templates?.title}</div>
                                                            {/* @ts-ignore */}
                                                            <div className="text-xs text-muted-foreground">Ver. {contract.contract_templates?.version}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{worker?.full_name || "不明"}</div>
                                                    <div className="text-xs text-muted-foreground">{worker?.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {job ? (
                                                        <>
                                                            <div className="font-medium text-slate-900">{job.title}</div>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                                <Building2 className="w-3 h-3" />
                                                                {job.clients?.name}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${contract.status === 'SIGNED' ? 'bg-green-100 text-green-800' :
                                                        contract.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        } `}>
                                                        {contract.status === 'SIGNED' ? '締結済み' :
                                                            contract.status === 'REJECTED' ? '却下' :
                                                                '未締結 (依頼中)'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    {contract.signed_at ? new Date(contract.signed_at).toLocaleString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/contracts/individual/${contract.id}`}
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors font-medium"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        確認
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                                契約書データがありません。
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
