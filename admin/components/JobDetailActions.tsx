"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteJob, duplicateJob } from "@/app/actions/job";
import { toast } from "sonner";
import { Copy, Trash2, Loader2, Edit } from "lucide-react";
import Link from "next/link";

interface JobDetailActionsProps {
    jobId: string;
}

export function JobDetailActions({ jobId }: JobDetailActionsProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const router = useRouter();

    const handleDuplicate = async () => {
        if (!confirm("この案件を複製しますか？")) return;
        setIsProcessing(true);
        try {
            const result = await duplicateJob(jobId);
            if (result.success) {
                toast.success("案件を複製しました");
                router.push(`/jobs/${result.data.id}`);
            } else {
                toast.error("案件の複製に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("本当にこの案件を削除しますか？\nこの操作は取り消せません。")) return;
        setIsProcessing(true);
        try {
            const result = await deleteJob(jobId);
            if (result.success) {
                toast.success("案件を削除しました");
                router.push("/jobs");
            } else {
                toast.error("案件の削除に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleDuplicate}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                複製
            </button>
            <button
                onClick={handleDelete}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
                <Trash2 className="w-4 h-4" />
                削除
            </button>
            <Link
                href={`/jobs/${jobId}/edit?returnTo=/jobs/${jobId}`}
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
            >
                <Edit className="w-4 h-4" />
                編集する
            </Link>
        </div>
    );
}
