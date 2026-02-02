"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Search, Plus, Calendar, Clock } from "lucide-react";

type Worker = {
    id: string;
    full_name: string;
    email: string;
};

type JobCopyDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onCopy: (data: { title: string; address_text: string; workerIds: string[]; start_time?: string; end_time?: string }) => Promise<void>;
    defaultTitle: string;
    defaultAddress: string;
    defaultStartDate?: string; // ISO string
    defaultEndDate?: string;   // ISO string
    assignedWorkerIds: string[];
    isFlexible?: boolean;
};

export function JobCopyDialog({
    isOpen,
    onClose,
    onCopy,
    defaultTitle,
    defaultAddress,
    defaultStartDate,
    defaultEndDate,
    assignedWorkerIds,
    isFlexible = false,
}: JobCopyDialogProps) {
    const [title, setTitle] = useState(defaultTitle);
    const [address, setAddress] = useState(defaultAddress);

    // Date/Time States
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");

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

            // Initialize dates
            if (defaultStartDate) {
                const start = new Date(defaultStartDate);
                // Adjust to JST (+9 hours) for display values
                const jstStart = new Date(start.getTime() + (9 * 60 * 60 * 1000));

                const toInputDate = (d: Date) => {
                    const y = d.getUTCFullYear();
                    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(d.getUTCDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                };
                const toInputTime = (d: Date) => {
                    const h = String(d.getUTCHours()).padStart(2, '0');
                    const m = String(d.getUTCMinutes()).padStart(2, '0');
                    return `${h}:${m}`;
                };

                setStartDate(toInputDate(jstStart));
                setStartTime(toInputTime(jstStart));

                if (defaultEndDate) {
                    const end = new Date(defaultEndDate);
                    const jstEnd = new Date(end.getTime() + (9 * 60 * 60 * 1000));
                    setEndDate(toInputDate(jstEnd));
                    setEndTime(toInputTime(jstEnd));
                }
            } else {
                // Default to today/now if no defaults provided
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const d = String(now.getDate()).padStart(2, '0');
                setStartDate(`${y}-${m}-${d}`);
                setStartTime("09:00");
                setEndDate(`${y}-${m}-${d}`);
                setEndTime(isFlexible ? "23:59" : "18:00");
            }

            fetchWorkers();
        }
    }, [isOpen, defaultTitle, defaultAddress, assignedWorkerIds, defaultStartDate, defaultEndDate]);

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

        // 日時は任意（期間指定案件の場合は空欄でOK）
        // ただし、開始日時と終了日時は両方入力するか、両方空欄にする必要がある
        const hasStartDateTime = startDate && startTime;
        const hasEndDateTime = endDate && endTime;

        if ((hasStartDateTime && !hasEndDateTime) || (!hasStartDateTime && hasEndDateTime)) {
            alert("開始日時と終了日時は両方入力するか、両方空欄にしてください");
            return;
        }

        setIsLoading(true);
        try {
            let startISO: string | undefined;
            let endISO: string | undefined;

            if (startDate && startTime && endDate && endTime) {
                // Reconstruct ISO strings assuming the input is JST
                startISO = new Date(`${startDate}T${startTime}:00+09:00`).toISOString();
                endISO = new Date(`${endDate}T${endTime}:00+09:00`).toISOString();
            }

            await onCopy({
                title: title.trim(),
                address_text: address.trim(),
                workerIds: selectedWorkerIds,
                start_time: startISO,
                end_time: endISO,
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

                        {/* Date and Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" /> {isFlexible ? "期間開始日" : "開始日時"}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" /> {isFlexible ? "期間終了日" : "終了日時"}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
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
                    <div className="space-y-3 pt-4 border-t border-slate-100">
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

                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm max-h-48 overflow-y-auto">
                                {isFetchingWorkers ? (
                                    <div className="p-4 flex justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                    </div>
                                ) : filteredWorkers.length === 0 ? (
                                    <p className="p-3 text-sm text-slate-500 text-center italic">
                                        {searchTerm ? "候補が見つかりません" : "追加できるスタッフがいません"}
                                    </p>
                                ) : (
                                    filteredWorkers.map((worker) => (
                                        <button
                                            key={worker.id}
                                            type="button"
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
