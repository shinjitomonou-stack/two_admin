"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit, Briefcase } from "lucide-react";
import BulkJobAssignmentModal from "./BulkJobAssignmentModal";

interface WorkerDetailActionsProps {
    workerId: string;
    workerName: string;
}

export default function WorkerDetailActions({ workerId, workerName }: WorkerDetailActionsProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

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

            <BulkJobAssignmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                workerId={workerId}
                workerName={workerName}
            />
        </div>
    );
}
