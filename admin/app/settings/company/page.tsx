"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CompanySettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        address: "",
        representative_name: "",
        phone: "",
        email: "",
        enable_line_notifications: true,
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const supabase = createClient();
            // Fetch the single row (if exists)
            const { data, error } = await supabase
                .from("company_settings")
                .select("*")
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error(error);
                // Don't block on error, just let user create new
            }

            if (data) {
                setFormData({
                    name: data.name || "",
                    address: data.address || "",
                    representative_name: data.representative_name || "",
                    phone: data.phone || "",
                    email: data.email || "",
                    enable_line_notifications: data.enable_line_notifications ?? true,
                });
            }
            setIsFetching(false);
        };

        fetchSettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        try {
            // Check if row exists
            const { data: existing } = await supabase
                .from("company_settings")
                .select("id")
                .limit(1)
                .maybeSingle();

            if (existing) {
                // Update
                const { error } = await supabase
                    .from("company_settings")
                    .update(formData)
                    .eq("id", existing.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from("company_settings")
                    .insert([formData]);
                if (error) throw error;
            }

            toast.success("保存しました");
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error(`エラーが発生しました: ${error.message}`);
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
            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/settings"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">自社情報設定</h2>
                            <p className="text-muted-foreground text-xs">
                                契約書テンプレートの変数として使用されます。
                            </p>
                        </div>
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
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg">基本情報</h3>
                    </div>

                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                会社名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                placeholder="例: 株式会社Teo"
                            />
                            <p className="text-xs text-muted-foreground">
                                <code>{`{{company_name}}`}</code> として使用されます。
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                住所 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                placeholder="例: 東京都渋谷区..."
                            />
                            <p className="text-xs text-muted-foreground">
                                <code>{`{{company_address}}`}</code> として使用されます。
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                代表者名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.representative_name}
                                onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                placeholder="例: 代表取締役 山田 太郎"
                            />
                            <p className="text-xs text-muted-foreground">
                                <code>{`{{company_rep}}`}</code> として使用されます。
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">電話番号</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="03-1234-5678"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">メールアドレス</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="info@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-sm font-medium">LINE通知を有効にする</label>
                                <p className="text-xs text-muted-foreground">
                                    ワーカーへの採用通知などをLINEで自動送信します。
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.enable_line_notifications}
                                    onChange={(e) => setFormData({ ...formData, enable_line_notifications: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

            </form>
        </AdminLayout >
    );
}
