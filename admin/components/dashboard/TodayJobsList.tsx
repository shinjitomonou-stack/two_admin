"use client";

import { useState } from "react";
import { updateJob } from "@/app/actions/job";
import { toast } from "sonner";
import { Loader2, MapPin, Clock, Building2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "下書き", color: "bg-gray-100 text-gray-700" },
    { value: "OPEN", label: "募集中", color: "bg-green-100 text-green-700" },
    { value: "FILLED", label: "満員", color: "bg-blue-100 text-blue-700" },
    { value: "IN_PROGRESS", label: "実施待ち", color: "bg-orange-100 text-orange-700" },
    { value: "COMPLETED", label: "完了", color: "bg-slate-100 text-slate-700" },
    { value: "CANCELLED", label: "中止", color: "bg-red-100 text-red-700" },
];

interface Job {
    id: string;
    title: string;
    status: string;
    start_time: string;
    end_time: string;
    address_text: string | null;
    clients: { name: string } | { name: string }[] | null;
}

interface TodayJobsListProps {
    jobs: Job[];
}

export function TodayJobsList({ jobs: initialJobs }: TodayJobsListProps) {
    const [jobs, setJobs] = useState(initialJobs);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleStatusChange = async (jobId: string, newStatus: string) => {
        setUpdatingId(jobId);
        try {
            const result = await updateJob(jobId, { status: newStatus });
            if (result.success) {
                setJobs(prev => prev.map(job =>
                    job.id === jobId ? { ...job, status: newStatus } : job
                ));
                toast.success("ステータスを更新しました");
            } else {
                throw result.error;
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("ステータスの更新に失敗しました");
        } finally {
            setUpdatingId(null);
        }
    };

    if (jobs.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">本日の予定案件はありません</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-border text-slate-500">
                        <tr>
                            <th className="px-6 py-3 font-medium">案件 / クライアント</th>
                            <th className="px-6 py-3 font-medium">時間</th>
                            <th className="px-6 py-3 font-medium">場所</th>
                            <th className="px-6 py-3 font-medium">ステータス更新</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {jobs.map((job) => {
                            // Find application scheduled for TODAY if any
                            const today = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
                            const todayApp = (job as any).job_applications?.find((app: any) =>
                                app.scheduled_work_start?.startsWith(today)
                            );

                            const displayStartTime = todayApp?.scheduled_work_start || job.start_time;
                            const displayEndTime = todayApp?.scheduled_work_end || job.end_time;

                            const startTime = new Date(displayStartTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                            const endTime = new Date(displayEndTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

                            return (
                                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <Link href={`/jobs/${job.id}`} className="font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1 group">
                                                {job.title}
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </Link>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Building2 className="w-3 h-3" />
                                                {(Array.isArray(job.clients) ? job.clients[0]?.name : job.clients?.name) || "未設定"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{startTime} - {endTime}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="truncate max-w-[150px]">{job.address_text || "場所未定"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative inline-block w-full max-w-[140px]">
                                            <select
                                                disabled={updatingId === job.id}
                                                value={job.status}
                                                onChange={(e) => handleStatusChange(job.id, e.target.value)}
                                                className={cn(
                                                    "w-full appearance-none px-3 py-1.5 rounded-lg text-xs font-bold border-none cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all",
                                                    STATUS_OPTIONS.find(o => o.value === job.status)?.color || "bg-slate-100 text-slate-700",
                                                    updatingId === job.id && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                {STATUS_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value} className="bg-white text-slate-900 font-normal">
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {updatingId === job.id && (
                                                <div className="absolute inset-y-0 right-2 flex items-center">
                                                    <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
