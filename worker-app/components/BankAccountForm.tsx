"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateBankAccount } from "@/app/actions/worker";

interface BankAccountFormProps {
    initialData?: {
        bankName: string;
        branchName: string;
        accountType: string;
        accountNumber: string;
        accountHolder: string;
    };
}

export function BankAccountForm({ initialData }: BankAccountFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        bankName: initialData?.bankName || "",
        branchName: initialData?.branchName || "",
        accountType: initialData?.accountType || "普通",
        accountNumber: initialData?.accountNumber || "",
        accountHolder: initialData?.accountHolder || "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Basic validation
            if (!formData.bankName || !formData.branchName || !formData.accountNumber || !formData.accountHolder) {
                throw new Error("すべての必須項目を入力してください");
            }

            if (!/^[ァ-ンー\s]+$/.test(formData.accountHolder)) {
                throw new Error("口座名義は全角カタカナで入力してください");
            }

            await updateBankAccount({
                bank_name: formData.bankName,
                branch_name: formData.branchName,
                account_type: formData.accountType,
                account_number: formData.accountNumber,
                account_holder_name: formData.accountHolder,
            });

            alert("口座情報を保存しました");
            router.push("/");
        } catch (error: any) {
            console.error(error);
            alert(error.message || "エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">銀行名 <span className="text-red-500">*</span></label>
                <input
                    required
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    type="text"
                    placeholder="例: みずほ銀行"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">支店名 <span className="text-red-500">*</span></label>
                <input
                    required
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleChange}
                    type="text"
                    placeholder="例: 渋谷支店"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">口座種別 <span className="text-red-500">*</span></label>
                <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="普通">普通</option>
                    <option value="当座">当座</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">口座番号 <span className="text-red-500">*</span></label>
                <input
                    required
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    type="text"
                    pattern="\d*"
                    placeholder="1234567"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">※ 半角数字7桁で入力してください</p>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">口座名義 (全角カナ) <span className="text-red-500">*</span></label>
                <input
                    required
                    name="accountHolder"
                    value={formData.accountHolder}
                    onChange={handleChange}
                    type="text"
                    placeholder="ヤマダ タロウ"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {isLoading ? "保存中..." : "口座情報を保存"}
                </button>
            </div>
        </form>
    );
}
