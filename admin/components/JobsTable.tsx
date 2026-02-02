"use client";

import { Calendar, MapPin, Users, Copy, Trash2, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { usePathname } from "next/navigation";

const STATUS_STYLES = {
    OPEN: "bg-green-100 text-green-700",
    FILLED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-slate-100 text-slate-700",
    CANCELLED: "bg-red-100 text-red-700",
    DRAFT: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS = {
    OPEN: "募集中",
    FILLED: "満員",
    IN_PROGRESS: "実施待ち",
    COMPLETED: "完了",
    CANCELLED: "中止",
    DRAFT: "下書き",
};

export interface Job {
    id: string;
    title: string;
    status: string;
    reward_amount: number;
    billing_amount: number | null;
    reward_tax_mode: string;
    billing_tax_mode: string;
    max_workers: number;
    start_time: string;
    end_time: string;
    is_flexible: boolean;
    work_period_start: string | null;
    work_period_end: string | null;
    address_text: string | null;
    description: string | null;
    auto_set_schedule: boolean;
    report_template_id: string | null;
    clients: { name: string } | null;
    report_templates?: { name: string } | null;
    job_applications: Array<{
        id: string;
        status: string;
        scheduled_work_start: string | null;
        actual_work_start: string | null;
        workers: { full_name: string } | null;
        worker_id: string;
        reports?: Array<{ id: string; status: string }>;
    }>;
}

interface JobsTableProps {
    jobs: Job[];
    onStatusChange: (jobId: string, newStatus: string) => Promise<void>;
    onDuplicate: (job: Job) => void;
    onDelete: (id: string) => Promise<void>;
    processingId: string | null;
}

export function JobsTable({ jobs, onStatusChange, onDuplicate, onDelete, processingId }: JobsTableProps) {
    const pathname = usePathname();

    return (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-24rem)]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-border text-slate-500 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 font-medium">案件名 / クライアント/パートナー</th>
                            <th className="px-6 py-3 font-medium">作業予定日 / 実施日</th>
                            <th className="px-6 py-3 font-medium">場所</th>
                            <th className="px-6 py-3 font-medium">報酬 / 請求金額</th>
                            <th className="px-6 py-3 font-medium">応募数 / 募集人数</th>
                            <th className="px-6 py-3 font-medium">アサイン済み</th>
                            <th className="px-6 py-3 font-medium">報告状況</th>
                            <th className="px-6 py-3 font-medium text-center">個別契約</th>
                            <th className="px-6 py-3 font-medium">ステータス</th>
                            <th className="px-6 py-3 font-medium text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {jobs.map((job) => {
                            const applications = job.job_applications || [];
                            const placementContracts = (job as any).client_job_contracts?.filter((c: any) => c.trading_type === 'PLACING') || [];
                            const linkedContract = (job as any).linked_contract;

                            const assignedApps = applications.filter(
                                (app: any) => app.status === "ASSIGNED" || app.status === "CONFIRMED"
                            );

                            const activePlacements = placementContracts.filter(
                                (c: any) => c.status === 'ACTIVE' || c.status === 'PENDING' || c.status === 'DRAFT'
                            );

                            // Add linked contract if it exists and is active, and NOT already in activePlacements
                            if (linkedContract && (linkedContract.status === 'ACTIVE' || linkedContract.status === 'PENDING' || linkedContract.status === 'DRAFT')) {
                                const alreadyIn = activePlacements.some((c: any) => c.id === linkedContract.id);
                                if (!alreadyIn) {
                                    activePlacements.push(linkedContract);
                                }
                            }

                            const totalApps = applications.length;
                            const assignedCount = assignedApps.length + activePlacements.length;

                            // Get scheduled and actual dates
                            const scheduledDates = applications
                                .map((app) => app.scheduled_work_start)
                                .filter((date): date is string => date !== null);
                            const actualDates = applications
                                .map((app) => app.actual_work_start)
                                .filter((date): date is string => date !== null);

                            const earliestScheduled = scheduledDates.length > 0
                                ? new Date(Math.min(...scheduledDates.map((d) => new Date(d).getTime())))
                                : null;
                            const earliestActual = actualDates.length > 0
                                ? new Date(Math.min(...actualDates.map((d) => new Date(d).getTime())))
                                : null;

                            return (
                                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link href={`/jobs/${job.id}`} className="block group">
                                            <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                                {job.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {job.clients?.name || "クライアント/パートナー未設定"}
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1 text-xs">
                                            {(earliestScheduled || !earliestActual) && (
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>予定: {formatDate(earliestScheduled ? earliestScheduled.toISOString() : job.start_time)}</span>
                                                </div>
                                            )}
                                            {earliestActual && (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>実施: {formatDate(earliestActual.toISOString())}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate max-w-[150px]">
                                                {job.address_text || "場所未定"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1 text-xs">
                                            <div className="font-medium text-slate-900">
                                                報酬: ¥{Math.round(job.reward_amount).toLocaleString()} /人
                                                <span className="text-[10px] text-muted-foreground ml-1">
                                                    (税込: ¥{Math.round(job.reward_amount * 1.1).toLocaleString()})
                                                </span>
                                            </div>
                                            {job.billing_amount && (
                                                <div className="text-blue-600">
                                                    請求: ¥{Math.round(job.billing_amount).toLocaleString()} /人
                                                    <span className="text-[10px] opacity-70 ml-1">
                                                        (税込: ¥{Math.round(job.billing_amount * 1.1).toLocaleString()})
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs text-slate-600">
                                                {totalApps} / {job.max_workers}名
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {assignedCount > 0 ? (
                                            <div className="space-y-1">
                                                <div className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded inline-block">
                                                    {assignedCount}名 / 社
                                                </div>
                                                <div className="text-xs text-slate-600">
                                                    {/* Show workers */}
                                                    {assignedApps.slice(0, 2).map((app: any, idx: number) => (
                                                        <div key={`worker-${idx}`}>{app.workers?.full_name}</div>
                                                    ))}
                                                    {/* Show companies */}
                                                    {activePlacements.slice(0, 2).map((c: any, idx: number) => (
                                                        <div key={`client-${idx}`} className="text-blue-600">{c.clients?.name} (業者)</div>
                                                    ))}
                                                    {assignedCount > 2 && (
                                                        <div className="text-slate-400">他{assignedCount - 2}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">未アサイン</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {assignedApps.length > 0 ? (
                                            <div className="space-y-2">
                                                <div className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1",
                                                    assignedApps.every(app => app.reports?.some(r => r.status === 'APPROVED'))
                                                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                                                        : assignedApps.some(app => (app.reports?.length || 0) > 0)
                                                            ? "bg-orange-100 text-orange-700 border border-orange-200"
                                                            : "bg-slate-100 text-slate-500 border border-slate-200"
                                                )}>
                                                    <FileText className="w-3 h-3" />
                                                    <span>
                                                        提出:{assignedApps.filter(app => (app.reports?.length || 0) > 0).length} / 承認:{assignedApps.filter(app => app.reports?.some(r => r.status === 'APPROVED')).length} / 全:{assignedApps.length}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {assignedApps.map((app, idx) => {
                                                        const report = app.reports?.[0];
                                                        const workerName = app.workers?.full_name || "不明なユーザー";

                                                        if (!report) {
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    title={`${workerName}: 未提出`}
                                                                    className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300 shadow-sm"
                                                                />
                                                            );
                                                        }

                                                        const isApproved = report.status === 'APPROVED';
                                                        return (
                                                            <Link
                                                                key={idx}
                                                                href={`/reports/${report.id}?returnTo=${encodeURIComponent(pathname)}`}
                                                                title={`${workerName}: ${isApproved ? '承認済み' : '提出済み'}`}
                                                                className={cn(
                                                                    "w-3 h-3 rounded-full border shadow-sm transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1",
                                                                    isApproved
                                                                        ? "bg-blue-500 border-blue-600 focus:ring-blue-400"
                                                                        : "bg-orange-500 border-orange-600 focus:ring-orange-400"
                                                                )}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {(job as any).linked_contract || (job as any).client_job_contracts?.length > 0 ? (
                                            <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">
                                                <FileText className="w-3 h-3" />
                                                あり
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={job.status}
                                            onChange={(e) => onStatusChange(job.id, e.target.value)}
                                            disabled={processingId === job.id}
                                            className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border-none focus:ring-2 focus:ring-slate-400 cursor-pointer disabled:opacity-50 appearance-none bg-transparent",
                                                STATUS_STYLES[job.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.DRAFT
                                            )}
                                        >
                                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                                <option key={value} value={value} className="bg-white text-slate-900">
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onDuplicate(job)}
                                                disabled={processingId === job.id}
                                                className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600 disabled:opacity-50"
                                                title="複製"
                                            >
                                                {processingId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => onDelete(job.id)}
                                                disabled={processingId === job.id}
                                                className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-red-600 disabled:opacity-50"
                                                title="削除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {jobs.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                                    案件がありません。
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
