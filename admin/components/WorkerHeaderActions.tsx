"use client";

import { useState } from "react";
import { Plus, FileUp, FileText } from "lucide-react";
import Link from "next/link";
import BulkWorkerRegisterModal from "./BulkWorkerRegisterModal";
import BulkBankAccountRegisterModal from "./BulkBankAccountRegisterModal";
import { useRouter } from "next/navigation";

export default function WorkerHeaderActions({ returnTo }: { returnTo?: string }) {
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const router = useRouter();

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={() => setIsBankModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm text-sm"
            >
                <FileText className="w-4 h-4" />
                口座情報一括登録
            </button>
            <button
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm text-sm"
            >
                <FileUp className="w-4 h-4" />
                一括登録
            </button>
            <Link
                href={`/workers/new?returnTo=${returnTo || "/workers"}`}
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm"
            >
                <Plus className="w-4 h-4" />
                新規登録
            </Link>

            <BulkWorkerRegisterModal
                isOpen={isBulkModalOpen}
                onClose={() => {
                    setIsBulkModalOpen(false);
                    router.refresh();
                }}
            />

            <BulkBankAccountRegisterModal
                isOpen={isBankModalOpen}
                onClose={() => {
                    setIsBankModalOpen(false);
                    router.refresh();
                }}
            />
        </div>
    );
}
