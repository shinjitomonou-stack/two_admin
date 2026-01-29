import AdminLayout from "@/components/layout/AdminLayout";
import { FileText, Edit, Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ContractTemplateFilters from "@/components/ContractTemplateFilters";
import { formatDate } from "@/lib/utils";

export default async function ContractTemplatesPage({
    searchParams
}: {
    searchParams: Promise<{ query?: string; status?: string; type?: string }>
}) {
    const params = await searchParams;
    const search = params.query || "";
    const status = params.status;
    const type = params.type;

    const supabase = await createClient();

    let query = supabase
        .from("contract_templates")
        .select("*, clients(id, name)");

    if (search) {
        query = query.ilike("title", `%${search}%`);
    }

    if (status !== undefined) {
        query = query.eq("is_active", status === "true");
    }

    if (type) {
        query = query.eq("type", type);
    }

    let { data: templates, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching templates with join:", error);
        // Fallback to simple query if join fails (migration might be missing)
        const fallbackQuery = supabase
            .from("contract_templates")
            .select("*");

        if (search) {
            fallbackQuery.ilike("title", `%${search}%`);
        }
        if (status !== undefined) {
            fallbackQuery.eq("is_active", status === "true");
        }
        if (type) {
            fallbackQuery.eq("type", type);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery.order("created_at", { ascending: false });
        if (fallbackError) {
            console.error("Error fetching templates (fallback):", fallbackError);
        } else {
            templates = fallbackData;
        }
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">契約書テンプレート管理</h2>
                        <p className="text-muted-foreground">
                            ワーカーとの契約に使用するテンプレートを管理します。
                        </p>
                    </div>
                    <Link
                        href="/contracts/templates/create"
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規作成
                    </Link>
                </div>

                <ContractTemplateFilters />

                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium w-32">種別</th>
                                    <th className="px-6 py-3 font-medium">テンプレート名</th>
                                    <th className="px-6 py-3 font-medium">クライアント</th>
                                    <th className="px-6 py-3 font-medium w-24">バージョン</th>
                                    <th className="px-6 py-3 font-medium w-32 text-center">ステータス</th>
                                    <th className="px-6 py-3 font-medium w-48 text-right">最終更新</th>
                                    <th className="px-6 py-3 font-medium w-24 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {templates?.map((template) => (
                                    <tr key={template.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${template.type === 'BASIC'
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'bg-purple-50 text-purple-700'
                                                }`}>
                                                <FileText className="w-3 h-3" />
                                                {template.type === 'BASIC' ? '基本契約' : '個別契約'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {template.title}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {/* @ts-ignore */}
                                            {template.clients?.name || <span className="text-slate-400">共通</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-500">
                                            v{template.version}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${template.is_active
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {template.is_active ? '有効' : '無効'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-500 tabular-nums">
                                            {formatDate(template.updated_at || template.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/contracts/templates/${template.id}`}
                                                className="inline-flex items-center justify-end gap-1 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                                編集
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {(!templates || templates.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                            テンプレートが見つかりませんでした。
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
