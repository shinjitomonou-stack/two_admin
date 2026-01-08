"use client";

import { useState } from "react";
import { deleteAdminUser } from "@/app/actions/admin-users";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteAdminButton({ adminId, adminEmail }: { adminId: string; adminEmail: string }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        /*
        if (!confirm(`管理者「${adminEmail}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
            return;
        }
        */

        setIsDeleting(true);
        const result = await deleteAdminUser(adminId);

        if (result?.error) {
            alert(result.error);
            setIsDeleting(false);
        }
        // On success, page will revalidate automatically
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 hover:bg-red-50 rounded-md transition-colors text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="削除"
        >
            {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Trash2 className="w-4 h-4" />
            )}
        </button>
    );
}
