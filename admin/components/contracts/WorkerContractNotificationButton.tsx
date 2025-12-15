"use client";

import { useState } from "react";
import { Send, Check, Loader2 } from "lucide-react";
import { sendWorkerContractNotification } from "@/app/actions/worker-contract-notification";
import { formatDate } from "@/lib/utils";

interface WorkerContractNotificationButtonProps {
    contractId: string;
    sentAt: string | null;
}

export default function WorkerContractNotificationButton({ contractId, sentAt }: WorkerContractNotificationButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

    const handleSend = async () => {
        if (!confirm("ワーカーにLINEで契約書発行の通知を送信しますか？")) {
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const res = await sendWorkerContractNotification(contractId);
            if (res.success) {
                setResult({ success: true, message: "送信しました" });
            } else {
                setResult({ success: false, message: res.error || "送信に失敗しました" });
            }
        } catch (error) {
            setResult({ success: false, message: "エラーが発生しました" });
        } finally {
            setIsLoading(false);
        }
    };

    if (sentAt) {
        return (
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">
                    <Check className="w-4 h-4" />
                    送信済み
                    <span className="text-xs opacity-75">
                        ({formatDate(sentAt)})
                    </span>
                </div>
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    className="text-xs text-blue-600 hover:underline mt-1 disabled:opacity-50"
                >
                    {isLoading ? "送信中..." : "再送信する"}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-2">
            <button
                onClick={handleSend}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg font-bold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Send className="w-4 h-4" />
                )}
                LINE通知を送る
            </button>
            {result && (
                <p className={`text-xs ${result.success ? "text-green-600" : "text-red-600"}`}>
                    {result.message}
                </p>
            )}
        </div>
    );
}
