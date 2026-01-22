"use client";

import { useState } from "react";
import { signBasicContract } from "@/app/actions/contract";
import { Loader2 } from "lucide-react";

export default function ContractSigningForm({ templateId }: { templateId: string }) {
    const [agreed, setAgreed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSign = async () => {
        if (!agreed) return;
        setIsLoading(true);

        try {
            const result = await signBasicContract(templateId);
            if (result?.error) {
                alert(result.error);
                setIsLoading(false);
            }
            // If no error, the server action will redirect
        } catch (e) {
            // Ignore NEXT_REDIRECT errors (these are expected when redirect() is called)
            if (e && typeof e === 'object' && 'digest' in e && typeof e.digest === 'string' && e.digest.includes('NEXT_REDIRECT')) {
                // This is a normal redirect, not an error
                return;
            }
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
                    私は上記の利用規約を十分に理解し、これに同意します。
                    <br />
                    <span className="text-xs text-slate-500">
                        ※ 同意ボタンを押すことで、同意の記録が保存されます。
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
                    "利用規約に同意する"
                )}
            </button>
        </div>
    );
}
