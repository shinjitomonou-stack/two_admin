"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Building2, Mail, Phone, MapPin, User, CreditCard, Banknote, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientAction } from "@/app/actions/client";
import { toast } from "sonner";

function CreateClientForm() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isPartner = searchParams.get('type') === 'PLACING';
    const label = isPartner ? 'パートナー' : 'クライアント';
    const returnTo = searchParams.get("returnTo");
    const supabase = createClient();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        business_number: "",
        representative_name: "",
        bank_name: "",
        bank_branch_name: "",
        bank_account_type: "",
        bank_account_number: "",
        bank_account_holder: "",
        billing_contact_name: "",
        billing_contact_email: "",
        billing_contact_phone: "",
        billing_method: "銀行振込",
        trading_role: searchParams.get('type') === 'PLACING' ? 'PARTNER' : 'CLIENT'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await createClientAction(formData);

            if (!result.success) throw result.error;

            toast.success(`${label}を登録しました`);
            router.push(returnTo || "/clients");
            router.refresh();
        } catch (error: any) {
            console.error("Error creating client:", error);
            toast.error(`エラーが発生しました: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href={returnTo || "/clients"}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{label}登録</h2>
                        <p className="text-muted-foreground">
                            新しい{label}情報を登録します。
                        </p>
                    </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="text-lg font-semibold">基本情報</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                メールアドレス
                            </label>
                            <input
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">事業者番号</label>
                            <input
                                name="business_number"
                                value={formData.business_number}
                                onChange={handleChange}
                                type="text"
                                placeholder="1234567890123"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-500" />
                                代表者名
                            </label>
                            <input
                                name="representative_name"
                                value={formData.representative_name}
                                onChange={handleChange}
                                type="text"
                                placeholder="山田 太郎"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>


                    </div>
                </div>

                {/* Role Information */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="text-lg font-semibold">組織の役割</h3>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                                <input
                                    type="radio"
                                    name="trading_role"
                                    value="CLIENT"
                                    checked={formData.trading_role === 'CLIENT'}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-slate-900"
                                />
                                <div className="text-sm font-medium">クライアント (発注元)</div>
                            </label>
                            <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                                <input
                                    type="radio"
                                    name="trading_role"
                                    value="PARTNER"
                                    checked={formData.trading_role === 'PARTNER'}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-slate-900"
                                />
                                <div className="text-sm font-medium">パートナー (外注先)</div>
                            </label>
                            <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                                <input
                                    type="radio"
                                    name="trading_role"
                                    value="BOTH"
                                    checked={formData.trading_role === 'BOTH'}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-slate-900"
                                />
                                <div className="text-sm font-medium">両方</div>
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            ※「両方」を選択すると、クライアント管理とパートナー管理の両方のリストに表示されます。
                        </p>
                    </div>
                </div>

                {/* Bank Account Information */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Banknote className="w-5 h-5" />
                        口座情報
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">銀行名</label>
                            <input
                                name="bank_name"
                                value={formData.bank_name}
                                onChange={handleChange}
                                type="text"
                                placeholder="みずほ銀行"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">支店名</label>
                            <input
                                name="bank_branch_name"
                                value={formData.bank_branch_name}
                                onChange={handleChange}
                                type="text"
                                placeholder="渋谷支店"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">口座種別</label>
                            <select
                                name="bank_account_type"
                                value={formData.bank_account_type}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            >
                                <option value="">選択してください</option>
                                <option value="普通">普通</option>
                                <option value="当座">当座</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">口座番号</label>
                            <input
                                name="bank_account_number"
                                value={formData.bank_account_number}
                                onChange={handleChange}
                                type="text"
                                placeholder="1234567"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">口座名義</label>
                            <input
                                name="bank_account_holder"
                                value={formData.bank_account_holder}
                                onChange={handleChange}
                                type="text"
                                placeholder="カ）テオ"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Billing Contact Information */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        請求担当者情報
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">担当者氏名</label>
                            <input
                                name="billing_contact_name"
                                value={formData.billing_contact_name}
                                onChange={handleChange}
                                type="text"
                                placeholder="佐藤 花子"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">担当者メールアドレス</label>
                            <input
                                name="billing_contact_email"
                                value={formData.billing_contact_email}
                                onChange={handleChange}
                                type="email"
                                placeholder="billing@teo-inc.com"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">担当者電話番号</label>
                            <input
                                name="billing_contact_phone"
                                value={formData.billing_contact_phone}
                                onChange={handleChange}
                                type="tel"
                                placeholder="03-1234-5678"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">請求方法</label>
                            <select
                                name="billing_method"
                                value={formData.billing_method}
                                onChange={handleChange}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            >
                                <option value="銀行振込">銀行振込</option>
                                <option value="請求書払い">請求書払い</option>
                                <option value="クレジットカード">クレジットカード</option>
                                <option value="その他">その他</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? "保存中..." : "登録する"}
                    </button>
                </div>
            </form>
        </AdminLayout>
    );
}

export default function CreateClientPage() {
    return (
        <Suspense fallback={<AdminLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div></AdminLayout>}>
            <CreateClientForm />
        </Suspense>
    );
}
