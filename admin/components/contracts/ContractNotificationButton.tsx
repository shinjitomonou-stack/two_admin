"use client";

import { useState } from "react";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { sendContractNotification } from "@/app/actions/contract-notification";
import { formatDate } from "@/lib/utils";

interface ContractNotificationButtonProps {
    contractId: string;
    sentAt: string | null;
}

export default function ContractNotificationButton({ contractId, sentAt }: ContractNotificationButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Optimistic UI could be used here, but for now relying on server revalidate
    // sentAt is passed from server component

    const handleSend = async () => {
        if (!confirm("この案件にアサインされているワーカー全員にLINE通知を送信しますか？")) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendContractNotification(contractId);

            if (result.success) {
                alert(`送信しました (送信数: ${result.sentCount}/${result.total})`);
            } else {
                alert(`送信に失敗しました: ${result.message || result.error}`);
            }
        } catch (error) {
            console.error("Error sending notification:", error);
            alert("エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    if (sentAt) {
        return (
            <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-md border border-green-200 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    LINE通知済み
                </div>
                <span className="text-xs text-muted-foreground mr-1">
                    {formatDate(sentAt)}
                </span>
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    className="text-xs text-slate-500 hover:text-slate-800 underline mt-1"
                >
                    {isLoading ? "送信中..." : "再送信する"}
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleSend}
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-[#06C755] text-white px-4 py-2 rounded-md hover:bg-[#05b34c] transition-colors text-sm font-bold shadow-sm disabled:opacity-50"
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            LINE通知を送る
        </button>
    );
}
