"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface StatusChangeProps {
    contractId: string;
    currentStatus: string;
    contractType: "client_contracts" | "client_job_contracts";
}

export default function StatusChanger({ contractId, currentStatus, contractType }: StatusChangeProps) {
    const [status, setStatus] = useState(currentStatus);
    const [isUpdating, setIsUpdating] = useState(false);
    const router = useRouter();

    const statusOptions = contractType === "client_contracts"
        ? [
            { value: "DRAFT", label: "下書き" },
            { value: "PENDING", label: "承認待ち" },
            { value: "ACTIVE", label: "有効" },
            { value: "EXPIRED", label: "期限切れ" },
            { value: "TERMINATED", label: "解約" },
        ]
        : [
            { value: "DRAFT", label: "下書き" },
            { value: "PENDING", label: "承認待ち" },
            { value: "ACTIVE", label: "有効" },
            { value: "COMPLETED", label: "完了" },
            { value: "CANCELLED", label: "キャンセル" },
        ];

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === status) return;

        setIsUpdating(true);
        const supabase = createClient();

        const { error } = await supabase
            .from(contractType)
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", contractId);

        if (error) {
            console.error("Status update error:", error);
            alert(`ステータスの更新に失敗しました: ${error.message}`);
            setIsUpdating(false);
            return;
        }

        setStatus(newStatus);
        setIsUpdating(false);
        router.refresh();
    };

    const getStatusStyle = (statusValue: string) => {
        const styles: Record<string, string> = {
            DRAFT: "bg-slate-100 text-slate-700 hover:bg-slate-200",
            PENDING: "bg-orange-100 text-orange-700 hover:bg-orange-200",
            ACTIVE: "bg-green-100 text-green-700 hover:bg-green-200",
            EXPIRED: "bg-red-100 text-red-700 hover:bg-red-200",
            TERMINATED: "bg-red-100 text-red-700 hover:bg-red-200",
            COMPLETED: "bg-blue-100 text-blue-700 hover:bg-blue-200",
            CANCELLED: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        };
        return styles[statusValue] || "bg-slate-100 text-slate-700";
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-lg mb-4">ステータス管理</h3>
            <div className="space-y-3">
                <div className="text-sm text-muted-foreground">現在のステータス</div>
                <div className="flex flex-wrap gap-2">
                    {statusOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleStatusChange(option.value)}
                            disabled={isUpdating}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${status === option.value
                                    ? getStatusStyle(option.value)
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            {option.label}
                            {status === option.value && " ✓"}
                        </button>
                    ))}
                </div>
                {isUpdating && (
                    <div className="text-sm text-muted-foreground">更新中...</div>
                )}
            </div>
        </div>
    );
}
