"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

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
            w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.email.toLowerCase().includes(searchTerm.toLowerCase())
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

    const handleWorkerSelect = (workerId: string) => {
        setSelectedWorkerIds((prev) => {
            if (prev.includes(workerId)) {
                return prev.filter((id) => id !== workerId);
            } else {
                return [...prev, workerId];
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">案件をコピー</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
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

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            スタッフ選択 ({selectedWorkerIds.length}名選択中)
                        </label>
                        <input
                            type="text"
                            placeholder="名前やメールアドレスで絞り込み..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        {isFetchingWorkers ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            </div>
                        ) : (
                            <select
                                multiple
                                size={8}
                                value={selectedWorkerIds}
                                onChange={(e) => {
                                    const options = Array.from(e.target.selectedOptions);
                                    const values = options.map((opt) => opt.value);
                                    setSelectedWorkerIds(values);
                                }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                {filteredWorkers.map((worker) => (
                                    <option
                                        key={worker.id}
                                        value={worker.id}
                                        className="py-1 cursor-pointer hover:bg-blue-50"
                                    >
                                        {worker.full_name} ({worker.email})
                                    </option>
                                ))}
                            </select>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Ctrl/Cmd + クリックで複数選択できます。スタッフなしでもコピー可能です。
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
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
