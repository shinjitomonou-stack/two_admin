"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Plus, MapPin, Calendar, Eye, Edit, Users, Copy, Trash2, Loader2 } from "lucide-react";
import { deleteJob, duplicateJob, updateJob } from "@/app/actions/job";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { JobFilters, FilterState } from "@/components/JobFilters";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Pagination from "@/components/ui/Pagination";
import BulkJobCreateModal from "@/components/BulkJobCreateModal";
import { JobCopyDialog } from "@/components/JobCopyDialog";
import { FileUp } from "lucide-react";

const ITEMS_PER_PAGE = 100;

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
    IN_PROGRESS: "作業中",
    COMPLETED: "完了",
    CANCELLED: "中止",
    DRAFT: "下書き",
};

interface Job {
    id: string;
    title: string;
    status: string;
    reward_amount: number;
    billing_amount: number | null;
    max_workers: number;
    start_time: string;
    end_time: string;
    address_text: string | null;
    clients: { name: string } | null;
    job_applications: Array<{
        id: string;
        status: string;
        scheduled_work_start: string | null;
        actual_work_start: string | null;
        workers: { full_name: string } | null;
    }>;
}

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
    const [paginatedJobs, setPaginatedJobs] = useState<Job[]>([]);
    const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [jobToCopy, setJobToCopy] = useState<{ id: string; title: string; address_text: string; assignedWorkerIds: string[] } | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const router = useRouter();
    const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const supabase = createClient();

        // Parallel fetch: Jobs and Clients
        const [jobsRes, clientsRes] = await Promise.all([
            supabase.from("jobs").select(`
                *,
                clients(name),
                job_applications(
                    id,
                    status,
                    scheduled_work_start,
                    actual_work_start,
                    workers(full_name)
                ),
                client_job_contracts!job_id (
                    id,
                    status,
                    trading_type,
                    clients(name)
                ),
                linked_contract: client_job_contracts!assigned_contract_id (
                    id,
                    status,
                    trading_type,
                    clients(name)
                )
            `).order("created_at", { ascending: false }),
            supabase.from("clients").select("id, name").order("name")
        ]);

        if (jobsRes.error) {
            console.error("Error fetching jobs:", jobsRes.error);
        } else {
            setJobs(jobsRes.data || []);
            setFilteredJobs(jobsRes.data || []);
        }

        if (clientsRes.error) {
            console.error("Error fetching clients:", clientsRes.error);
        } else {
            setClients(clientsRes.data || []);
        }

        setLoading(false);
    };

    const handleFilterChange = (filters: FilterState) => {
        let filtered = [...jobs];

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(
                (job) =>
                    job.title.toLowerCase().includes(searchLower) ||
                    (job.clients?.name || "").toLowerCase().includes(searchLower) ||
                    (job.address_text || "").toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (filters.status.length > 0) {
            filtered = filtered.filter((job) => filters.status.includes(job.status));
        }

        // Client filter
        if (filters.clientId) {
            filtered = filtered.filter((job) => {
                const clientData = job.clients as any;
                return clientData?.id === filters.clientId;
            });
        }

        // Date range filter (based on scheduled work start from applications)
        if (filters.dateFrom || filters.dateTo) {
            filtered = filtered.filter((job) => {
                const applications = job.job_applications || [];
                const scheduledDates = applications
                    .map((app) => app.scheduled_work_start)
                    .filter((date): date is string => date !== null);

                if (scheduledDates.length === 0) return false;

                const earliestDate = new Date(Math.min(...scheduledDates.map((d) => new Date(d).getTime())));

                if (filters.dateFrom && earliestDate < new Date(filters.dateFrom)) {
                    return false;
                }
                if (filters.dateTo && earliestDate > new Date(filters.dateTo)) {
                    return false;
                }
                return true;
            });
        }

        setFilteredJobs(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    };

    // Update paginated jobs when filteredJobs or currentPage changes
    useEffect(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        setPaginatedJobs(filteredJobs.slice(startIndex, endIndex));
    }, [filteredJobs, currentPage]);

    const handleDuplicate = (job: Job) => {
        const assignedWorkerIds = job.job_applications
            ?.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED")
            .map(app => (app as any).worker_id) || [];

        setJobToCopy({
            id: job.id,
            title: job.title,
            address_text: job.address_text || "",
            assignedWorkerIds,
        });
        setIsCopyDialogOpen(true);
    };

    const handleCopySubmit = async (data: { title: string; address_text: string; workerIds: string[] }) => {
        if (!jobToCopy) return;

        setProcessingId(jobToCopy.id);
        try {
            const result = await duplicateJob(jobToCopy.id, {
                title: data.title,
                address_text: data.address_text,
                workerIds: data.workerIds,
            });
            if (result.success) {
                toast.success("案件を複製しました");
                setIsCopyDialogOpen(false);
                router.push(`/jobs/${result.data.id}`);
            } else {
                toast.error("案件の複製に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("本当にこの案件を削除しますか？\nこの操作は取り消せません。")) return;
        setProcessingId(id);
        try {
            const result = await deleteJob(id);
            if (result.success) {
                toast.success("案件を削除しました");
                fetchData();
            } else {
                toast.error("案件の削除に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setProcessingId(null);
        }
    };

    const handleStatusChange = async (jobId: string, newStatus: string) => {
        setProcessingId(jobId);
        try {
            const result = await updateJob(jobId, { status: newStatus });
            if (result.success) {
                toast.success("ステータスを更新しました");
                // Update local state
                setJobs(prev => prev.map(job => job.id === jobId ? { ...job, status: newStatus } : job));
                setFilteredJobs(prev => prev.map(job => job.id === jobId ? { ...job, status: newStatus } : job));
            } else {
                toast.error("更新に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-500">読み込み中...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">案件管理</h2>
                        <p className="text-muted-foreground">
                            登録されている案件の確認・編集・新規作成を行います。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm"
                        >
                            <FileUp className="w-4 h-4" />
                            一括登録
                        </button>
                        <Link
                            href="/jobs/create?returnTo=/jobs"
                            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            新規案件作成
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <JobFilters onFilterChange={handleFilterChange} clients={clients} />

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                    {filteredJobs.length}件の案件
                </div>

                {/* Table */}
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
                                    <th className="px-6 py-3 font-medium">ステータス</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginatedJobs.map((job) => {
                                    const applications = job.job_applications || [];
                                    const placementContracts = (job as any).client_job_contracts?.filter((c: any) => c.trading_type === 'PLACING') || [];
                                    const linkedContract = (job as any).linked_contract;

                                    const assignedApps = applications.filter(
                                        (app: any) => app.status === "ASSIGNED" || app.status === "CONFIRMED"
                                    );

                                    const activePlacements = placementContracts.filter(
                                        (c: any) => c.status === 'ACTIVE' || c.status === 'PENDING' || c.status === 'DRAFT'
                                    );

                                    // Add linked contract if it exists and is active
                                    if (linkedContract && (linkedContract.status === 'ACTIVE' || linkedContract.status === 'PENDING' || linkedContract.status === 'DRAFT')) {
                                        activePlacements.push(linkedContract);
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
                                                <select
                                                    value={job.status}
                                                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
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
                                                        onClick={() => handleDuplicate(job)}
                                                        disabled={processingId === job.id}
                                                        className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600 disabled:opacity-50"
                                                        title="複製"
                                                    >
                                                        {processingId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(job.id)}
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
                                {filteredJobs.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                                            {jobs.length === 0
                                                ? "案件がまだありません。"
                                                : "条件に一致する案件がありません。"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
                <BulkJobCreateModal
                    isOpen={isBulkModalOpen}
                    onClose={() => {
                        setIsBulkModalOpen(false);
                        fetchData();
                    }}
                />
                {jobToCopy && (
                    <JobCopyDialog
                        isOpen={isCopyDialogOpen}
                        onClose={() => setIsCopyDialogOpen(false)}
                        onCopy={handleCopySubmit}
                        defaultTitle={jobToCopy.title}
                        defaultAddress={jobToCopy.address_text}
                        assignedWorkerIds={jobToCopy.assignedWorkerIds}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
