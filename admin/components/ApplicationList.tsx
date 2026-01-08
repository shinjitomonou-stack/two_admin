"use client";

import { useState } from "react";
import { ApplicationRow } from "./ApplicationRow";
import { ManualAssignmentButton } from "./ManualAssignmentButton";
import { assignMultipleWorkers } from "@/app/actions/application";
import { Loader2, Users, CheckSquare, Square } from "lucide-react";
import { useRouter } from "next/navigation";

type Application = {
    id: string;
    worker_id: string;
    status: string;
    created_at: string;
    scheduled_work_start?: string | null;
    scheduled_work_end?: string | null;
    actual_work_start?: string | null;
    actual_work_end?: string | null;
    workers: {
        id: string;
        full_name: string;
        tags: string[];
        line_user_id?: string | null;
    };
    reports?: {
        id: string;
        status: string;
    }[];
};

type Job = {
    id: string;
    max_workers: number;
    title: string;
};

export function ApplicationList({
    applications,
    job,
    placementCount = 0
}: {
    applications: Application[];
    job: Job;
    placementCount?: number;
}) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);

    // Calculate current confirmed/assigned count (workers + placement contracts)
    const confirmedCount = applications.filter(
        app => app.status === 'ASSIGNED' || app.status === 'CONFIRMED'
    ).length + placementCount;

    const remainingSlots = Math.max(0, job.max_workers - confirmedCount);

    const handleSelect = (id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.length === applications.length) {
            setSelectedIds([]);
        } else {
            // Only select APPLIED status applications
            const appliedIds = applications
                .filter(app => app.status === 'APPLIED')
                .map(app => app.id);
            setSelectedIds(appliedIds);
        }
    };

    const handleBulkAssign = async () => {
        if (selectedIds.length === 0) return;
        if (selectedIds.length > remainingSlots) {
            alert(`残り枠は${remainingSlots}名ですが、${selectedIds.length}名が選択されています。`);
            return;
        }

        // if (!confirm(`${selectedIds.length}名のワーカーを採用しますか？`)) return;

        setIsAssigning(true);
        try {
            const result = await assignMultipleWorkers(selectedIds);
            if (result.success) {
                alert("採用しました");
                setSelectedIds([]);
                router.refresh();
            } else {
                throw result.error;
            }
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        応募者一覧 ({applications?.length || 0})
                    </h3>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>募集: {job.max_workers}名</span>
                        <span className="text-slate-300">|</span>
                        <span className={remainingSlots === 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                            残り枠: {remainingSlots}名
                        </span>
                        <span className="text-slate-300">|</span>
                        <span>確定済み: {confirmedCount}名</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkAssign}
                            disabled={isAssigning}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                            {selectedIds.length}名を一括採用
                        </button>
                    )}
                    <ManualAssignmentButton
                        jobId={job.id}
                        existingWorkerIds={applications?.map(app => app.workers?.id).filter(Boolean) || []}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-border text-slate-500">
                        <tr>
                            <th className="px-6 py-3 w-12">
                                <button
                                    onClick={handleSelectAll}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    {selectedIds.length > 0 && selectedIds.length === applications.filter(a => a.status === 'APPLIED').length ? (
                                        <CheckSquare className="w-5 h-5" />
                                    ) : (
                                        <Square className="w-5 h-5" />
                                    )}
                                </button>
                            </th>
                            <th className="px-6 py-3 font-medium">ワーカー</th>
                            <th className="px-6 py-3 font-medium">ステータス</th>
                            <th className="px-6 py-3 font-medium">応募日時</th>
                            <th className="px-6 py-3 font-medium text-right">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {applications?.map((app) => (
                            <ApplicationRow
                                key={app.id}
                                app={app}
                                isSelectable={app.status === 'APPLIED'}
                                isSelected={selectedIds.includes(app.id)}
                                onSelect={() => handleSelect(app.id)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
