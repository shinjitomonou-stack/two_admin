"use client";

import { useState } from "react";
import { Key, Loader2, Check, X } from "lucide-react";
import { resetWorkerPasswordAction } from "@/app/actions/worker";
import { toast } from "sonner";

export default function ResetWorkerPassword({ workerId }: { workerId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReset = async () => {
        if (!password || password.length < 6) {
            toast.error("パスワードは6文字以上で入力してください");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await resetWorkerPasswordAction(workerId, password);
            if (result.success) {
                toast.success("パスワードを正常に変更しました");
                setIsOpen(false);
                setPassword("");
            } else {
                toast.error(result.error as string);
            }
        } catch (error) {
            toast.error("エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
                <Key className="w-4 h-4" />
                パスワードを変更する
            </button>
        );
    }

    return (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    新しいパスワード
                </span>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上の新パスワード"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <div className="flex gap-2">
                <button
                    onClick={handleReset}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    変更を確定
                </button>
                <button
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                    キャンセル
                </button>
            </div>
        </div>
    );
}
