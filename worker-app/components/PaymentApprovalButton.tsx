"use client";

import { useState } from "react";
import { approvePaymentNotice } from "@/app/actions/payment";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PaymentApprovalButton({ id }: { id: string }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleApprove = async () => {
        if (!confirm("内容に間違いがないことを確認しましたか？\n承認後は変更できません。")) return;

        setIsLoading(true);
        try {
            const result = await approvePaymentNotice(id);
            if (result.success) {
                toast.success("支払通知書を承認しました");
            } else {
                toast.error("承認に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleApprove}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    <CheckCircle2 className="w-5 h-5" />
                    この内容で承認する
                </>
            )}
        </button>
    );
}
