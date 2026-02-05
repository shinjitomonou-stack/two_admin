"use client";

import { Copy, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { deleteContractTemplate, duplicateContractTemplate } from "@/app/actions/contract-template";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ContractTemplateActionsProps {
    templateId: string;
    title: string;
}

export default function ContractTemplateActions({ templateId, title }: ContractTemplateActionsProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm(`テンプレート「${title}」を削除してもよろしいですか？`)) return;

        setIsDeleting(true);
        try {
            const result = await deleteContractTemplate(templateId);
            if (result.success) {
                toast.success("テンプレートを削除しました");
                router.refresh();
            } else {
                toast.error("削除に失敗しました");
            }
        } catch (error) {
            toast.error("エラーが発生しました");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicate = async () => {
        setIsDuplicating(true);
        try {
            const result = await duplicateContractTemplate(templateId);
            if (result.success) {
                toast.success("テンプレートを複製しました");
                // Redirect to the edit page of the duplicated template
                router.push(`/contracts/templates/${result.data.id}`);
            } else {
                toast.error("複製に失敗しました");
            }
        } catch (error) {
            toast.error("エラーが発生しました");
        } finally {
            setIsDuplicating(false);
        }
    };

    return (
        <div className="flex items-center justify-end gap-2">
            <button
                onClick={handleDuplicate}
                disabled={isDuplicating || isDeleting}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                title="複製"
            >
                {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
                onClick={handleDelete}
                disabled={isDeleting || isDuplicating}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                title="削除"
            >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
        </div>
    );
}
