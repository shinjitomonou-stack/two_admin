"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

type Worker = {
    id: string;
    full_name: string;
    email: string;
};

export function ManualAssignmentButton({ jobId, existingWorkerIds }: { jobId: string; existingWorkerIds: string[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const openModal = async () => {
        setIsOpen(true);
        // Fetch available workers
        const response = await fetch(`/api/workers/available?jobId=${jobId}`);
        const data = await response.json();
        setWorkers(data.workers || []);
    };

    const handleAssign = async () => {
        if (!selectedWorkerId) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/jobs/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId,
                    workerId: selectedWorkerId,
                }),
            });

            if (response.ok) {
                window.location.reload();
            } else {
                alert("アサインに失敗しました");
            }
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={openModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                ワーカーを手動追加
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">ワーカーを手動でアサイン</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-slate-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">ワーカーを選択</label>
                            <select
                                value={selectedWorkerId}
                                onChange={(e) => setSelectedWorkerId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">選択してください</option>
                                {workers
                                    .filter(w => !existingWorkerIds.includes(w.id))
                                    .map((worker) => (
                                        <option key={worker.id} value={worker.id}>
                                            {worker.full_name} ({worker.email})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedWorkerId || isLoading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? "処理中..." : "アサイン"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
