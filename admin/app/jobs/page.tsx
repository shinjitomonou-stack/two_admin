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

import { JobsTable, Job } from "@/components/JobsTable";

const ITEMS_PER_PAGE = 100;

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
                clients(id, name),
                job_applications(
                    id,
                    status,
                    scheduled_work_start,
                    actual_work_start,
                    workers(full_name),
                    worker_id
                ),
                client_job_contracts!job_id (
                    id,
                    status,
                    trading_type,
                    clients(id, name)
                ),
                linked_contract: client_job_contracts!assigned_contract_id (
                    id,
                    status,
                    trading_type,
                    clients(id, name)
                )
            `).order("created_at", { ascending: false }),
            supabase.from("clients").select("id, name").order("name")
        ]);

        if (jobsRes.error) {
            console.error("Error fetching jobs:", jobsRes.error);
        } else {
            console.log(`Fetched ${jobsRes.data?.length || 0} jobs`);
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
                return (job as any).client_id === filters.clientId || (job as any).clients?.id === filters.clientId;
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
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
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
                <JobsTable
                    jobs={paginatedJobs}
                    onStatusChange={handleStatusChange}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    processingId={processingId}
                />

                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}

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
