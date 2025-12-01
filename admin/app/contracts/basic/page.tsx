import AdminLayout from "@/components/layout/AdminLayout";
import { Search, Filter, FileText, Download, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function SignedContractsPage() {
    const supabase = await createClient();
    const { data: contracts, error } = await supabase
        .from("worker_basic_contracts")
        .select("*, workers(full_name, email), contract_templates(title, version)")
        .order("signed_at", { ascending: false });

    if (error) {
        console.error("Error fetching contracts:", error);
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">締結済み契約書 (基本契約)</h2>
                        <p className="text-muted-foreground">
                            ワーカーと締結した基本契約書の履歴と証跡を確認できます。
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="ワーカー名で検索..."
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
                                    <th className="px-6 py-3 font-medium">ワーカー</th>
                                    <th className="px-6 py-3 font-medium">契約書名</th>
                                    <th className="px-6 py-3 font-medium">締結日時</th>
                                    <th className="px-6 py-3 font-medium">IPアドレス</th>
                                    <th className="px-6 py-3 font-medium text-right">詳細</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {contracts?.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {/* @ts-ignore */}
                                            <div className="font-medium text-slate-900">{contract.workers?.full_name}</div>
                                            {/* @ts-ignore */}
                                            <div className="text-xs text-muted-foreground">{contract.workers?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                <div>
                                                    {/* @ts-ignore */}
                                                    <div className="font-medium">{contract.contract_templates?.title}</div>
                                                    {/* @ts-ignore */}
                                                    <div className="text-xs text-muted-foreground">Ver. {contract.contract_templates?.version}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {formatDate(contract.signed_at)}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {contract.ip_address || "N/A"}
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
                                ))}
                                {(!contracts || contracts.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            締結済みの契約書はまだありません。
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
