"use client";

import { useState } from "react";
import { signBasicContract } from "@/app/actions/contract";
import { Loader2 } from "lucide-react";

export default function ContractSigningForm({ templateId, workerId }: { templateId: string, workerId: string }) {
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSign = async () => {
        if (!agreed) return;
        setIsLoading(true);

        try {
            const result = await signBasicContract(templateId, workerId);
            if (result?.error) {
                alert(result.error);
                setIsLoading(false);
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-5 h-5 text-slate-900 focus:ring-slate-900 rounded border-gray-300"
                />
                <span className="text-sm text-slate-700">
                    私は上記の契約内容を十分に理解し、これに同意します。
                    <br />
                    <span className="text-xs text-slate-500">
                        ※ 同意ボタンを押すことで、電子署名として記録されます。
                    </span>
                </span>
            </label>

            <button
                onClick={handleSign}
                disabled={!agreed || isLoading}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    "契約内容に同意して締結する"
                )}
            </button>
        </div>
    );
}
