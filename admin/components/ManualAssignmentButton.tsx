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
    const [contracts, setContracts] = useState<any[]>([]);
    const [selectedWorkerId, setSelectedWorkerId] = useState("");
    const [selectedContractId, setSelectedContractId] = useState("");
    const [assignmentMode, setAssignmentMode] = useState<"NEW" | "EXISTING">("NEW");
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const openModal = async () => {
        setIsOpen(true);
        setSearchTerm("");
        setSelectedWorkerId("");
        setSelectedContractId("");
        setAssignmentMode("NEW");

        // Fetch available workers
        const workerRes = await fetch(`/api/workers/available?jobId=${jobId}`);
        const workerData = await workerRes.json();
        setWorkers(workerData.workers || []);

        // Fetch existing active individual contracts
        const contractRes = await fetch(`/api/contracts/available?jobId=${jobId}`);
        const contractData = await contractRes.json();
        setContracts(contractData.contracts || []);
    };

    const filteredWorkers = workers
        .filter(w => !existingWorkerIds.includes(w.id))
        .filter(w =>
            w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

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
                    contractId: assignmentMode === "EXISTING" ? selectedContractId : undefined,
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

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">ワーカーを検索・選択</label>
                                <input
                                    type="text"
                                    placeholder="名前やメールアドレスで絞り込み..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    autoFocus
                                />
                            </div>

                            <select
                                size={5}
                                value={selectedWorkerId}
                                onChange={(e) => setSelectedWorkerId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[120px]"
                            >
                                <option value="" disabled className="text-slate-400">
                                    {filteredWorkers.length === 0 ? "候補が見つかりません" : "ワーカーを選択してください"}
                                </option>
                                {filteredWorkers.map((worker) => (
                                    <option key={worker.id} value={worker.id}>
                                        {worker.full_name} ({worker.email})
                                    </option>
                                ))}
                            </select>

                            <div className="space-y-1.5 pt-2">
                                <label className="text-sm font-medium">契約の紐付け</label>
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentMode("NEW")}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded ${assignmentMode === "NEW" ? "bg-white shadow-sm text-blue-600" : "text-slate-500"}`}
                                    >
                                        新規契約を作成
                                    </button>
                                    <button
                                        type="button"
                                        disabled={contracts.length === 0}
                                        onClick={() => setAssignmentMode("EXISTING")}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded ${assignmentMode === "EXISTING" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 disabled:opacity-50"}`}
                                    >
                                        既存契約に紐付け ({contracts.length})
                                    </button>
                                </div>
                            </div>

                            {assignmentMode === "EXISTING" && (
                                <select
                                    value={selectedContractId}
                                    onChange={(e) => setSelectedContractId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="" disabled>契約を選択してください</option>
                                    {contracts.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title} - {c.clients?.name} (¥{c.contract_amount?.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            )}

                            {searchTerm && filteredWorkers.length > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                    {filteredWorkers.length}件見つかりました
                                </p>
                            )}
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
                                disabled={!selectedWorkerId || (assignmentMode === "EXISTING" && !selectedContractId) || isLoading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? "処理中..." : (assignmentMode === "EXISTING" ? "紐付けてアサイン" : "アサイン")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
