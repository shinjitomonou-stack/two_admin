"use client";

import { useState, useEffect } from "react";
import { X, Search, Calendar, CheckCircle, Loader2, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { assignWorkerToJobs } from "@/app/actions/application";
import { toast } from "sonner";
import { formatDate, formatTime } from "@/lib/utils";

interface BulkJobAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    workerId: string;
    workerName: string;
}

interface Job {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    address_text: string;
    status: string;
    max_workers: number;
    current_workers_count: number;
}

export default function BulkJobAssignmentModal({ isOpen, onClose, workerId, workerName }: BulkJobAssignmentModalProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [searchDate, setSearchDate] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchJobs();
            setSelectedJobIds([]);
        }
    }, [isOpen, searchDate, searchKeyword]);

    const fetchJobs = async () => {
        setIsLoading(true);
        const supabase = createClient();

        let query = supabase
            .from("jobs")
            .select(`
                id, title, start_time, end_time, address_text, status, max_workers,
                job_applications(count)
            `)
            .eq("status", "OPEN") // Only show open jobs? Maybe also ASSIGNED if distinct from FULL?
            .order("start_time", { ascending: true });

        if (searchDate) {
            // Filter by specific date
            const startOfDay = new Date(searchDate).toISOString();
            const endOfDay = new Date(new Date(searchDate).setHours(23, 59, 59, 999)).toISOString();
            query = query.gte("start_time", startOfDay).lte("start_time", endOfDay);
        } else {
            // Default to upcoming jobs from today
            query = query.gte("start_time", new Date().toISOString());
        }

        if (searchKeyword) {
            query = query.ilike("title", `%${searchKeyword}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            toast.error("案件の取得に失敗しました");
        } else {
            const formattedJobs = data.map((job: any) => ({
                ...job,
                current_workers_count: job.job_applications?.[0]?.count || 0
            }));
            setJobs(formattedJobs);
        }
        setIsLoading(false);
    };

    const toggleJobSelection = (jobId: string) => {
        setSelectedJobIds(prev =>
            prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
        );
    };

    const handleAssign = async () => {
        if (selectedJobIds.length === 0) return;

        if (!confirm(`${selectedJobIds.length}件の案件に ${workerName} さんをアサインしますか？`)) return;

        setIsSubmitting(true);
        try {
            const result = await assignWorkerToJobs(workerId, selectedJobIds);
            if (result.success) {
                toast.success(`${result.results?.success ?? 0}件の案件にアサインしました`);
                onClose();
            } else {
                toast.error("アサインに失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            案件へアサイン
                        </h2>
                        <p className="text-sm text-slate-500">
                            <span className="font-bold text-slate-700">{workerName}</span> さんを複数の案件にまとめてアサインします。
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="案件名で検索..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            value={searchDate}
                            onChange={(e) => setSearchDate(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Job List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            条件に一致する募集中案件は見つかりませんでした
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {jobs.map(job => {
                                const isSelected = selectedJobIds.includes(job.id);
                                return (
                                    <div
                                        key={job.id}
                                        onClick={() => toggleJobSelection(job.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                                            : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                                                }`}>
                                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                                                        {job.title}
                                                    </h3>
                                                    <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                        {formatDate(job.start_time)}
                                                    </div>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <ClockIcon className="w-3.5 h-3.5" />
                                                        {formatTime(job.start_time)} - {formatTime(job.end_time)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPreIcon className="w-3.5 h-3.5" />
                                                        {job.address_text || "場所未設定"}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <UsersIcon className="w-3.5 h-3.5" />
                                                        <span className={job.current_workers_count >= job.max_workers ? "text-red-500 font-bold" : ""}>
                                                            {job.current_workers_count}/{job.max_workers}名
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-sm text-slate-500">
                        {selectedJobIds.length} 件選択中
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleAssign}
                            disabled={selectedJobIds.length === 0 || isSubmitting}
                            className="px-8 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    処理中...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    選択した案件にアサイン
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function MapPreIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}
