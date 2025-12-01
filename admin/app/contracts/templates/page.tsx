import AdminLayout from "@/components/layout/AdminLayout";
import { FileText, Edit, Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ContractTemplatesPage() {
    const supabase = await createClient();
    const { data: templates, error } = await supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching templates:", error);
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">契約書テンプレート管理</h2>
                        <p className="text-muted-foreground">
                            ワーカーとの契約に使用するテンプレートを管理します。
                        </p>
                    </div>
                    <Link
                        href="/contracts/templates/create"
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規作成
                    </Link>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {templates?.map((template) => (
                        <div key={template.id} className="bg-white p-6 rounded-xl border border-border shadow-sm flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2 rounded-lg ${template.type === 'BASIC' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                    <FileText className="w-6 h-6" />
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${template.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {template.is_active ? '有効' : '無効'}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg mb-1">{template.title}</h3>
                            <p className="text-xs text-muted-foreground mb-4 font-mono">Ver. {template.version}</p>

                            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {template.type === 'BASIC' ? '基本契約' : '個別契約'}
                                </span>
                                <Link
                                    href={`/contracts/templates/${template.id}`}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                    編集
                                </Link>
                            </div>
                        </div>
                    ))}

                    {(!templates || templates.length === 0) && (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <p>テンプレートがまだありません。</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
