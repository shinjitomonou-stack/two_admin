"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createWorkerAction } from "@/app/actions/worker";
import { toast } from "sonner";

export default function NewWorkerPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: "",
        name_kana: "",
        email: "",
        phone: "",
        tags: [] as string[],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await createWorkerAction(formData);

            if (!result.success) throw result.error;

            toast.success("ワーカーを登録しました");
            router.push(`/workers/${result.data.id}`);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error(typeof error === 'string' ? error : `エラーが発生しました: ${error.message || "不明なエラー"}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/workers"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">ワーカー新規登録</h2>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        登録する
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <p className="text-sm text-muted-foreground border-b pb-4">
                        管理者がワーカーを代理登録します。登録後、ワーカーは設定されたメールアドレスでログインが可能になります（初期パスワードはランダムに設定されます）。
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">氏名 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="案件 太郎"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">氏名(カナ)</label>
                            <input
                                type="text"
                                value={formData.name_kana}
                                onChange={(e) => setFormData({ ...formData, name_kana: e.target.value })}
                                placeholder="アンケン タロウ"
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
                            placeholder="worker@example.com"
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">電話番号</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="090-0000-0000"
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>

                    <div className="space-y-2 pt-4 border-t border-border">
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
                </div>
            </form>
        </AdminLayout>
    );
}
