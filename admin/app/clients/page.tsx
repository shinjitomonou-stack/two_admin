import AdminLayout from "@/components/layout/AdminLayout";
import { Building2, Search, Filter, Plus, MoreHorizontal, Eye, Edit } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function ClientsPage() {
    const supabase = await createClient();
    const { data: clients, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching clients:", error);
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">クライアント管理</h2>
                        <p className="text-muted-foreground">
                            案件の発注元となるクライアント企業を管理します。
                        </p>
                    </div>
                    <Link
                        href="/clients/create"
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規クライアント登録
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="会社名、メールアドレスで検索..."
                            className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500">
                                <tr>
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
                                                    href={`/clients/${client.id}`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600"
                                                    title="詳細"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/clients/${client.id}/edit`}
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
                                            クライアントがまだ登録されていません。
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
