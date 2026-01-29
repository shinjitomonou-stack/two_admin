import AdminLayout from "@/components/layout/AdminLayout";
import { Eye, Plus, FileSignature, Building2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import ServerPagination from "@/components/ui/ServerPagination";
import ContractFilters from "@/components/ContractFilters";

const ITEMS_PER_PAGE = 50;

export default async function ContractsPage({
    searchParams
}: {
    searchParams: Promise<{ tab?: string; page?: string; query?: string; status?: string }>
}) {
    const params = await searchParams;
    const currentTab = params.tab || 'basic';
    const currentPage = Number(params.page) || 1;
    const search = params.query || "";
    const status = params.status || "";

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const supabase = await createClient();

    let basicContracts = [];
    let individualContracts = [];
    let totalCount = 0;

    if (currentTab === 'basic') {
        let query = supabase
            .from("worker_basic_contracts")
            .select("*, workers(full_name, email), contract_templates(title, version)", { count: "exact" });

        if (status) {
            query = query.eq("status", status);
        }
        if (search) {
            // Note: Supabase doesn't support .or() across joins in a single string easily without a custom RPC or complex filter
            // For now, if searching, we'll fetch and filter if needed, or use a simpler filter.
            // A common workaround is to use filter() on the join
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'workers' });
        }

        const { data, count, error } = await query
            .order("signed_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (!error) {
            basicContracts = data || [];
            totalCount = count || 0;
        }
    } else {
        let query = supabase
            .from("job_individual_contracts")
            .select(`
                *,
                contract_templates(title, version, client_id, clients(name)),
                workers(full_name, email),
                job_applications!application_id(
                    workers(full_name, email),
                    jobs(
                        title,
                        clients(name)
                    )
                )
            `, { count: "exact" });

        if (status) {
            query = query.eq("status", status);
        }
        if (search) {
            // prioritize worker name search for individual contracts
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: 'workers' });
        }

        const { data, count, error } = await query
            .order("id", { ascending: false })
            .range(from, to);

        if (error) {
            console.error("Error fetching individual contracts:", error.message || error);
            throw new Error(`Individual Contract Fetch Failed: ${error.message}`);
        } else {
            if (data && data.length > 0) {
                console.log("Available columns in job_individual_contracts:", Object.keys(data[0]));
            } else {
                // Try to get one record without filtering to see columns
                const { data: sample } = await supabase.from("job_individual_contracts").select("*").limit(1);
                if (sample && sample.length > 0) {
                    console.log("Sample record columns:", Object.keys(sample[0]));
                }
            }
            console.log(`Fetched ${data?.length || 0} individual contracts.`);
            individualContracts = data || [];
            totalCount = count || 0;
        }
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
                <ContractFilters />

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                    {totalCount}件の契約
                    {(search || status) && (
                        <span className="ml-2 text-muted-foreground">
                            条件指定あり
                        </span>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-[calc(100vh-25rem)]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-medium">契約書名</th>
                                    <th className="px-6 py-3 font-medium">ワーカー</th>
                                    {currentTab === 'individual' && <th className="px-6 py-3 font-medium">案件名 / クライアント/パートナー</th>}
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
                                                {search || status ? "条件に一致する契約書が見つかりませんでした。" : "契約書データがありません。"}
                                            </td>
                                        </tr>
                                    )
                                ) : (
                                    // Individual Contracts List
                                    individualContracts.length > 0 ? individualContracts.map((contract) => {
                                        // @ts-ignore
                                        const worker = contract.workers || contract.job_applications?.workers;
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
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                            <Building2 className="w-3 h-3" />
                                                            {/* @ts-ignore */}
                                                            {contract.contract_templates?.clients?.name || <span className="text-slate-400">共通</span>}
                                                        </div>
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
                                                {search || status ? "条件に一致する契約書が見つかりませんでした。" : "契約書データがありません。"}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <ServerPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            baseUrl="/contracts"
                            searchParams={params}
                        />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
