"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateWorkerAction } from "@/app/actions/worker";
import { toast } from "sonner";

export default function EditWorkerPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [id, setId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: "",
        name_kana: "",
        email: "",
        phone: "",
        line_name: "",
        line_id: "",
        postal_code: "",
        address: "",
        gender: "",
        birth_date: "",
        tags: [] as string[],
        is_verified: false,
    });

    useEffect(() => {
        const fetchWorker = async () => {
            const resolvedParams = await params;
            setId(resolvedParams.id);

            const supabase = createClient();
            const { data, error } = await supabase
                .from("workers")
                .select("*")
                .eq("id", resolvedParams.id)
                .single();

            if (error) {
                console.error(error);
                alert("ワーカーの取得に失敗しました");
                router.push("/workers");
                return;
            }

            if (data) {
                setFormData({
                    full_name: data.full_name,
                    name_kana: data.name_kana || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    line_name: data.line_name || "",
                    line_id: data.line_id || "",
                    postal_code: data.postal_code || "",
                    address: data.address || "",
                    gender: data.gender || "",
                    birth_date: data.birth_date || "",
                    tags: data.tags || [],
                    is_verified: data.is_verified || false,
                });
            }
            setIsFetching(false);
        };

        fetchWorker();
    }, [params, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        try {
            const result = await updateWorkerAction(id!, formData);

            if (!result.success) throw result.error;

            toast.success("保存しました");
            router.push(`/workers/${id}`);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            const message = typeof error === 'string' ? error : (error.message || "不明なエラー");
            toast.error(`エラーが発生しました: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/workers/${id}`}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">ワーカー編集</h2>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        保存する
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">氏名 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">氏名(カナ)</label>
                            <input
                                type="text"
                                value={formData.name_kana}
                                onChange={(e) => setFormData({ ...formData, name_kana: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">メールアドレス <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">電話番号</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">LINE名</label>
                            <input
                                type="text"
                                value={formData.line_name}
                                onChange={(e) => setFormData({ ...formData, line_name: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">LINE ID</label>
                            <input
                                type="text"
                                value={formData.line_id}
                                onChange={(e) => setFormData({ ...formData, line_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">郵便番号</label>
                            <input
                                type="text"
                                value={formData.postal_code}
                                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-medium">住所</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">性別</label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="">未選択</option>
                                <option value="male">男性</option>
                                <option value="female">女性</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">生年月日</label>
                            <input
                                type="date"
                                value={formData.birth_date}
                                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">タグ (カンマ区切り)</label>
                            <input
                                type="text"
                                placeholder="例: 早朝対応可, 運転免許, 経験者"
                                value={formData.tags.join(", ")}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                            <p className="text-[10px] text-slate-400">複数のタグを入力する場合はカンマ（,）で区切ってください。</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">本人確認ステータス</label>
                            <div className="flex items-center gap-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_verified}
                                        onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                                        className="w-4 h-4 text-slate-900 focus:ring-slate-900 rounded"
                                    />
                                    <span className="text-sm">確認済み</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
