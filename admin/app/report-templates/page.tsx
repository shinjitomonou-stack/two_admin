import AdminLayout from "@/components/layout/AdminLayout";
import { Plus, Eye, Edit } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export default async function ReportTemplatesPage() {
    const supabase = await createClient();

    const { data: templates, error } = await supabase
        .from("report_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching templates:", error);
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">作業報告テンプレート</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            案件で使用する作業報告のテンプレートを管理します
                        </p>
                    </div>
                    <Link
                        href="/report-templates/create"
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規作成
                    </Link>
                </div>

                {/* Templates List */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-border text-slate-500">
                            <tr>
                                <th className="px-6 py-3 font-medium">テンプレート名</th>
                                <th className="px-6 py-3 font-medium">説明</th>
                                <th className="px-6 py-3 font-medium">カスタムフィールド数</th>
                                <th className="px-6 py-3 font-medium">作成日</th>
                                <th className="px-6 py-3 font-medium text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {templates?.map((template) => (
                                <tr key={template.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {template.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {template.description || "説明なし"}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {Array.isArray(template.fields) ? template.fields.length : 0} 個
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {formatDateTime(template.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/report-templates/${template.id}`}
                                                className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600"
                                                title="詳細"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/report-templates/${template.id}/edit`}
                                                className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-green-600"
                                                title="編集"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!templates || templates.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        テンプレートがありません。新規作成してください。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
