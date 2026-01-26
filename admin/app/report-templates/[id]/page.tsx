import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Edit, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function ReportTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: template, error } = await supabase
        .from("report_templates")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

    if (error || !template) {
        return notFound();
    }

    const fields = Array.isArray(template.fields) ? template.fields : [];

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/report-templates"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">テンプレート詳細</h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                {template.name}
                            </p>
                        </div>
                    </div>
                    <Link
                        href={`/report-templates/${template.id}/edit`}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Edit className="w-4 h-4" />
                        編集する
                    </Link>
                </div>

                {/* Basic Info */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                        基本情報
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">テンプレート名</label>
                            <div className="text-sm font-medium mt-1">{template.name}</div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">作成日時</label>
                            <div className="text-sm font-medium mt-1">{formatDateTime(template.created_at)}</div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">説明</label>
                            <div className="text-sm mt-1 text-slate-700 whitespace-pre-wrap">
                                {template.description || "説明なし"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fields Info */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-slate-400" />
                        カスタムフィールド ({fields.length})
                    </h3>
                    <div className="text-sm text-muted-foreground mb-4">
                        デフォルト項目（開始・終了日時、内容、写真）に加えて以下の項目が表示されます。
                    </div>

                    {fields.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                            カスタムフィールドはありません
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {fields.map((field: any, index: number) => (
                                <div key={field.id || index} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">{field.label}</span>
                                            {field.required && (
                                                <span className="bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">必須</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            タイプ: {
                                                field.type === 'text' ? 'テキスト (1行)' :
                                                    field.type === 'textarea' ? 'テキスト (複数行)' :
                                                        field.type === 'number' ? '数値' :
                                                            field.type === 'select' ? '選択肢' :
                                                                field.type === 'checkbox' ? 'チェックボックス' :
                                                                    field.type === 'photo' ? '写真' : field.type
                                            }
                                        </div>
                                        {field.type === 'select' && field.options && (
                                            <div className="text-[10px] text-slate-400 mt-1">
                                                オプション: {field.options.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                        ID: {field.id}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
