"use client";

import { useState } from "react";
import { Loader2, CheckCircle, FileSignature } from "lucide-react";
import { signIndividualContract } from "@/app/actions/contract";

type Props = {
    contractId: string;
};

export default function IndividualContractSigningForm({ contractId }: Props) {
    const [isAgreed, setIsAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAgreed) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("contractId", contractId);

            const result = await signIndividualContract(formData);
            if (result?.error) {
                alert(result.error);
            }
        } catch (error: any) {
            // Ignore NEXT_REDIRECT errors (these are expected when redirect() is called in server actions)
            if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.includes('NEXT_REDIRECT')) {
                return;
            }
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-start gap-3">
                <div className="mt-1">
                    <input
                        type="checkbox"
                        id="agree"
                        checked={isAgreed}
                        onChange={(e) => setIsAgreed(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                </div>
                <label htmlFor="agree" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                    私は、上記契約内容を確認し、その内容に同意した上で、本契約を締結することに承諾します。
                </label>
            </div>

            <button
                type="submit"
                disabled={!isAgreed || isSubmitting}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <FileSignature className="w-5 h-5" />
                )}
                契約内容に同意して署名する
            </button>
        </form>
    );
}
