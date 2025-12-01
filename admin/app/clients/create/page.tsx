"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Building2, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function CreateClientPage() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase
                .from("clients")
                .insert([formData]);

            if (error) throw error;

            alert("クライアントを登録しました");
            router.push("/clients");
            router.refresh();
        } catch (error: any) {
            console.error("Error creating client:", error);
            alert(`エラーが発生しました: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/clients"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">新規クライアント登録</h2>
                        <p className="text-muted-foreground">
                            新しいクライアント情報を登録します。
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-500" />
                                会社名 / 屋号 <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                type="text"
                                placeholder="株式会社Teo"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-500" />
                                メールアドレス <span className="text-red-500">*</span>
                            </label>
                            <input
                                required
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                type="email"
                                placeholder="contact@teo-inc.com"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-500" />
                                電話番号
                            </label>
                            <input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                type="tel"
                                placeholder="03-1234-5678"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                住所
                            </label>
                            <input
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                type="text"
                                placeholder="東京都渋谷区..."
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isLoading ? "保存中..." : "登録する"}
                        </button>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
