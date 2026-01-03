"use client";

import { useState } from "react";
import { updateJob } from "@/app/actions/job";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";

const STATUS_LABELS = {
    OPEN: "募集中",
    FILLED: "満員",
    IN_PROGRESS: "作業中",
    COMPLETED: "完了",
    CANCELLED: "中止",
    DRAFT: "下書き",
};

const STATUS_STYLES = {
    OPEN: "bg-green-100 text-green-700 border-green-200",
    FILLED: "bg-blue-100 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-orange-100 text-orange-700 border-orange-200",
    COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
    DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
};

export function JobStatusSelect({ jobId, currentStatus }: { jobId: string, currentStatus: string }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [status, setStatus] = useState(currentStatus);

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === status) return;

        setIsUpdating(true);
        try {
            const result = await updateJob(jobId, { status: newStatus });
            if (result.success) {
                setStatus(newStatus);
                toast.success("ステータスを更新しました");
            } else {
                throw result.error;
            }
        } catch (error: any) {
            console.error(error);
            toast.error("更新に失敗しました");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="relative inline-block">
            <select
                value={status}
                disabled={isUpdating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`
                    appearance-none pl-3 pr-8 py-1 rounded border text-sm font-bold cursor-pointer transition-all
                    focus:outline-none focus:ring-2 focus:ring-slate-400
                    ${STATUS_STYLES[status as keyof typeof STATUS_STYLES] || "bg-slate-100 text-slate-700"}
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
            >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="bg-white text-slate-900 font-medium">
                        {label}
                    </option>
                ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50">
                {isUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                )}
            </div>
        </div>
    );
}
