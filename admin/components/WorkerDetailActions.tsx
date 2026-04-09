"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, Briefcase, Trash2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import BulkJobAssignmentModal from "./BulkJobAssignmentModal";
import { deleteWorkerAction, restoreWorkerAction } from "@/app/actions/worker";

interface WorkerDetailActionsProps {
    workerId: string;
    workerName: string;
    isDeleted?: boolean;
}

export default function WorkerDetailActions({ workerId, workerName, isDeleted }: WorkerDetailActionsProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDelete = async () => {
        const confirmText = window.prompt(
            `本当に「${workerName}」を削除しますか？\n一覧から非表示になり、ログインもできなくなります。\n削除するには「削除」と入力してください。`
        );
        if (confirmText !== "削除") {
            if (confirmText !== null) toast.error("入力が一致しないためキャンセルしました");
            return;
        }

        setIsProcessing(true);
        try {
            const result = await deleteWorkerAction(workerId);
            if (!result.success) throw new Error(result.error);
            toast.success("ワーカーを削除しました");
            router.push("/workers");
            router.refresh();
        } catch (error: any) {
            toast.error(`削除に失敗しました: ${error.message || "不明なエラー"}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestore = async () => {
        if (!window.confirm(`「${workerName}」を復元しますか？`)) return;

        setIsProcessing(true);
        try {
            const result = await restoreWorkerAction(workerId);
            if (!result.success) throw new Error(result.error);
            toast.success("ワーカーを復元しました");
            router.refresh();
        } catch (error: any) {
            toast.error(`復元に失敗しました: ${error.message || "不明なエラー"}`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (isDeleted) {
        return (
            <div className="flex items-center gap-3">
                <button
                    onClick={handleRestore}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 bg-white text-blue-600 border border-blue-300 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    復元する
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
            >
                <Briefcase className="w-4 h-4" />
                案件にアサイン
            </button>
            <Link
                href={`/workers/${workerId}/edit?returnTo=/workers/${workerId}`}
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
            >
                <Edit className="w-4 h-4" />
                編集する
            </Link>
            <button
                onClick={handleDelete}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 bg-white text-red-600 border border-red-300 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                削除
            </button>

            <BulkJobAssignmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                workerId={workerId}
                workerName={workerName}
            />
        </div>
    );
}
