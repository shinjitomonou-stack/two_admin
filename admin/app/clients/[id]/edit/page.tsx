"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2, Building2, Mail, Phone, MapPin, User, CreditCard, Banknote } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateClientAction } from "@/app/actions/client";
import { toast } from "sonner";

function EditClientForm({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get("returnTo");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [id, setId] = useState<string | null>(null);

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
    });

    useEffect(() => {
        const fetchClient = async () => {
            const resolvedParams = await params;
            setId(resolvedParams.id);

            const supabase = createClient();
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .eq("id", resolvedParams.id)
                .single();

            if (error) {
                console.error(error);
                alert("クライアントの取得に失敗しました");
                router.push("/clients");
                return;
            }

            if (data) {
                setFormData({
                    name: data.name,
                    email: data.email,
                    phone: data.phone || "",
                    address: data.address || "",
                    business_number: data.business_number || "",
                    representative_name: data.representative_name || "",
                    bank_name: data.bank_name || "",
                    bank_branch_name: data.bank_branch_name || "",
                    bank_account_type: data.bank_account_type || "",
                    bank_account_number: data.bank_account_number || "",
                    bank_account_holder: data.bank_account_holder || "",
                    billing_contact_name: data.billing_contact_name || "",
                    billing_contact_email: data.billing_contact_email || "",
                    billing_contact_phone: data.billing_contact_phone || "",
                    billing_method: data.billing_method || "銀行振込",
                });
            }
            setIsFetching(false);
        };

        fetchClient();
    }, [params, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        try {
            const result = await updateClientAction(id!, formData);

            if (!result.success) throw result.error;

            toast.success("保存しました");
            router.push(returnTo || `/clients/${id}`);
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
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={returnTo || `/clients/${id}`}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">クライアント編集</h2>
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
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                            />
                        </div>


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
            </form>
        </AdminLayout>
    );
}

export default function EditClientPage(props: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<AdminLayout><div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div></AdminLayout>}>
            <EditClientForm {...props} />
        </Suspense>
    );
}
