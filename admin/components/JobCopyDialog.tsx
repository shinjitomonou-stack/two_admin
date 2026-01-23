"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Search, Plus } from "lucide-react";

type Worker = {
    id: string;
    full_name: string;
    email: string;
};

type JobCopyDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onCopy: (data: { title: string; address_text: string; workerIds: string[] }) => Promise<void>;
    defaultTitle: string;
    defaultAddress: string;
    assignedWorkerIds: string[];
};

export function JobCopyDialog({
    isOpen,
    onClose,
    onCopy,
    defaultTitle,
    defaultAddress,
    assignedWorkerIds,
}: JobCopyDialogProps) {
    const [title, setTitle] = useState(defaultTitle);
    const [address, setAddress] = useState(defaultAddress);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>(assignedWorkerIds);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingWorkers, setIsFetchingWorkers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitle(defaultTitle);
            setAddress(defaultAddress);
            setSelectedWorkerIds(assignedWorkerIds);
            setSearchTerm("");
            fetchWorkers();
        }
    }, [isOpen, defaultTitle, defaultAddress, assignedWorkerIds]);

    const fetchWorkers = async () => {
        setIsFetchingWorkers(true);
        try {
            const res = await fetch("/api/workers/all");
            const data = await res.json();
            setWorkers(data.workers || []);
        } catch (error) {
            console.error("Error fetching workers:", error);
        } finally {
            setIsFetchingWorkers(false);
        }
    };

    const filteredWorkers = workers.filter(
        (w) =>
            (w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                w.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
            !selectedWorkerIds.includes(w.id)
    );

    const handleCopy = async () => {
        if (!title.trim()) {
            alert("タイトルを入力してください");
            return;
        }
        if (!address.trim()) {
            alert("場所を入力してください");
            return;
        }

        setIsLoading(true);
        try {
            await onCopy({
                title: title.trim(),
                address_text: address.trim(),
                workerIds: selectedWorkerIds,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const addWorker = (workerId: string) => {
        setSelectedWorkerIds((prev) => [...prev, workerId]);
        setSearchTerm("");
    };

    const removeWorker = (workerId: string) => {
        setSelectedWorkerIds((prev) => prev.filter((id) => id !== workerId));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-bold">案件をコピー</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                    {/* Title and Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">タイトル</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="案件タイトル"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">場所</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="住所"
                            />
                        </div>
                    </div>

                    {/* Staff Selection Section */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                        <label className="text-sm font-medium flex items-center justify-between">
                            <span>アサインするスタッフ</span>
                            <span className="text-xs font-normal text-slate-500">{selectedWorkerIds.length}名選択中</span>
                        </label>

                        {/* Selected List */}
                        <div className="flex flex-wrap gap-2 p-3 min-h-[50px] bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            {selectedWorkerIds.length === 0 ? (
                                <p className="text-xs text-slate-400 self-center w-full text-center italic">スタッフが選択されていません</p>
                            ) : (
                                selectedWorkerIds.map((id) => {
                                    const worker = workers.find((w) => w.id === id);
                                    return (
                                        <div key={id} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                                            <span>{worker?.full_name || "読み込み中..."}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeWorker(id)}
                                                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Search and Results */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="スタッフを検索・追加..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            {(searchTerm || isFetchingWorkers) && (
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm max-h-40 overflow-y-auto">
                                    {isFetchingWorkers ? (
                                        <div className="p-4 flex justify-center">
                                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                        </div>
                                    ) : filteredWorkers.length === 0 ? (
                                        <p className="p-3 text-sm text-slate-500 text-center italic">候補が見つかりません</p>
                                    ) : (
                                        filteredWorkers.map((worker) => (
                                            <button
                                                key={worker.id}
                                                onClick={() => addWorker(worker.id)}
                                                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-sm transition-colors border-b last:border-b-0 border-slate-100"
                                            >
                                                <div>
                                                    <span className="font-medium text-slate-900">{worker.full_name}</span>
                                                    <span className="text-xs text-slate-500 ml-2">{worker.email}</span>
                                                </div>
                                                <Plus className="w-4 h-4 text-blue-600" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                コピー中...
                            </>
                        ) : (
                            "コピーを作成"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
