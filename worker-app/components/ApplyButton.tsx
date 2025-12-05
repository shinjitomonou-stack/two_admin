"use client";

import { useState } from "react";
import { applyJob } from "@/app/actions/job";
import { Loader2 } from "lucide-react";

export function ApplyButton({
    jobId,
    disabled,
    disabledLabel
}: {
    jobId: string;
    disabled?: boolean;
    disabledLabel?: string;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleApply = async () => {
        if (disabled) return;
        if (!confirm("この案件に応募しますか？")) return;

        setIsLoading(true);
        const result = await applyJob(jobId);

        if (result?.error) {
            alert(result.error);
            setIsLoading(false);
        }
        // If success, revalidatePath will update the UI, but we can also reload to be sure
        // or just let the parent re-render if it was a server component
    };

    return (
        <button
            onClick={handleApply}
            disabled={isLoading || disabled}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    応募処理中...
                </>
            ) : (
                disabled ? (disabledLabel || "応募できません") : "この案件に応募する"
            )}
        </button>
    );
}
