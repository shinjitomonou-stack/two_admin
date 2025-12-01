"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FieldType = "text" | "textarea" | "number" | "select" | "checkbox" | "photo";

type CustomField = {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    placeholder?: string;
    options?: string[];
};

export default function CreateReportTemplatePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
    });
    const [fields, setFields] = useState<CustomField[]>([]);

    const addField = () => {
        const newField: CustomField = {
            id: `field_${Date.now()}`,
            label: "",
            type: "text",
            required: false,
        };
        setFields([...fields, newField]);
    };

    const updateField = (id: string, updates: Partial<CustomField>) => {
        setFields(fields.map(field =>
            field.id === id ? { ...field, ...updates } : field
        ));
    };

    const removeField = (id: string) => {
        setFields(fields.filter(field => field.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        try {
            const { error } = await supabase
                .from("report_templates")
                .insert({
                    name: formData.name,
                    description: formData.description,
                    fields: fields,
                });

            if (error) throw error;

            alert("テンプレートを作成しました");
            router.push("/report-templates");
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(`エラーが発生しました: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/report-templates"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">報告テンプレート作成</h2>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        保存する
                    </button>
                </div>

                {/* Basic Info */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="font-semibold text-lg">基本情報</h3>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">テンプレート名 <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="例: 清掃作業報告"
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">説明</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="このテンプレートの用途を説明してください"
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[80px]"
                        />
                    </div>
                </div>

                {/* Custom Fields */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">カスタムフィールド</h3>
                        <button
                            type="button"
                            onClick={addField}
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            フィールドを追加
                        </button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        デフォルトで「作業開始日時」「作業終了日時」「作業内容」「写真」が含まれます。
                        追加で必要な項目を設定してください。
                    </div>

                    {fields.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            カスタムフィールドがありません。「フィールドを追加」ボタンから追加してください。
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="border border-slate-200 rounded-lg p-4 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <GripVertical className="w-5 h-5 text-slate-400 mt-2 cursor-move" />

                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">フィールド名</label>
                                                <input
                                                    type="text"
                                                    value={field.label}
                                                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                    placeholder="例: 清掃箇所の数"
                                                    className="w-full px-3 py-2 rounded-md border border-input text-sm"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">フィールドタイプ</label>
                                                <select
                                                    value={field.type}
                                                    onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                                                    className="w-full px-3 py-2 rounded-md border border-input text-sm"
                                                >
                                                    <option value="text">テキスト (1行)</option>
                                                    <option value="textarea">テキスト (複数行)</option>
                                                    <option value="number">数値</option>
                                                    <option value="select">選択肢</option>
                                                    <option value="checkbox">チェックボックス</option>
                                                    <option value="photo">写真</option>
                                                </select>
                                            </div>

                                            {field.type === "select" && (
                                                <div className="col-span-2 space-y-2">
                                                    <label className="text-xs font-medium">選択肢 (カンマ区切り)</label>
                                                    <input
                                                        type="text"
                                                        value={field.options?.join(", ") || ""}
                                                        onChange={(e) => updateField(field.id, {
                                                            options: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                                                        })}
                                                        placeholder="例: 洗剤A, 洗剤B, 洗剤C"
                                                        className="w-full px-3 py-2 rounded-md border border-input text-sm"
                                                    />
                                                </div>
                                            )}

                                            <div className="col-span-2 flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`required_${field.id}`}
                                                    checked={field.required}
                                                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <label htmlFor={`required_${field.id}`} className="text-sm cursor-pointer">
                                                    必須項目
                                                </label>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeField(field.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </form>
        </AdminLayout>
    );
}
