"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JobsTable, Job } from "@/components/JobsTable";
import { JobFilters, FilterState } from "@/components/JobFilters";
import { JobCopyDialog } from "@/components/JobCopyDialog";
import BulkJobCreateModal from "@/components/BulkJobCreateModal";
import { updateJob, duplicateJob, deleteJob } from "@/app/actions/job";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Briefcase, Users, CheckCircle, Clock, Loader2 } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";

interface JobsDashboardViewProps {
    title: string;
    description: string;
    targetDate: Date;
}

export function JobsDashboardView({ title, description, targetDate }: JobsDashboardViewProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
    const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [jobToCopy, setJobToCopy] = useState<{ id: string; title: string; address_text: string; assignedWorkerIds: string[] } | null>(null);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchData();
    }, [targetDate]);

    const fetchData = async () => {
        setLoading(true);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const [jobsRes, clientsRes] = await Promise.all([
            supabase.from("jobs").select(`
                *,
                clients(name),
                job_applications(
                    id,
                    status,
                    scheduled_work_start,
                    actual_work_start,
                    workers(full_name),
                    worker_id,
                    reports(id, status)
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
            `)
                .gte("start_time", startOfDay.toISOString())
                .lte("start_time", endOfDay.toISOString())
                .order("start_time", { ascending: true }),
            supabase.from("clients").select("id, name").order("name")
        ]);

        if (jobsRes.error) {
            toast.error("データの取得に失敗しました");
        } else {
            setJobs(jobsRes.data || []);
            setFilteredJobs(jobsRes.data || []);
        }

        if (clientsRes.data) {
            setClients(clientsRes.data);
        }
        setLoading(false);
    };

    const handleFilterChange = (filters: FilterState) => {
        let filtered = [...jobs];
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(j =>
                j.title.toLowerCase().includes(searchLower) ||
                j.clients?.name?.toLowerCase().includes(searchLower)
            );
        }
        if (filters.status.length > 0) {
            filtered = filtered.filter(j => filters.status.includes(j.status));
        }
        if (filters.clientId) {
            filtered = filtered.filter(j => (j as any).clients?.id === filters.clientId);
        }
        setFilteredJobs(filtered);
    };

    const handleStatusChange = async (jobId: string, newStatus: string) => {
        setProcessingId(jobId);
        try {
            const result = await updateJob(jobId, { status: newStatus });
            if (result.success) {
                toast.success("ステータスを更新しました");
                setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
                setFilteredJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
            }
        } catch (e) {
            toast.error("更新に失敗しました");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDuplicate = (job: Job) => {
        const assignedWorkerIds = job.job_applications
            ?.filter((app: any) => app.status === "ASSIGNED" || app.status === "CONFIRMED")
            .map((app: any) => app.worker_id) || [];

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
            const result = await duplicateJob(jobToCopy.id, data);
            if (result.success) {
                toast.success("案件を複製しました");
                setIsCopyDialogOpen(false);
                router.push(`/jobs/${result.data.id}`);
            }
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("案件を削除しますか？")) return;
        setProcessingId(id);
        try {
            const result = await deleteJob(id);
            if (result.success) {
                toast.success("削除しました");
                fetchData();
            }
        } finally {
            setProcessingId(null);
        }
    };

    // Stats Calculation
    const totalJobs = jobs.length;
    const totalMaxWorkers = jobs.reduce((sum, j) => sum + j.max_workers, 0);
    const assignedCount = jobs.reduce((sum, j) => {
        const assignedApps = j.job_applications?.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED").length || 0;
        const placementContracts = (j as any).client_job_contracts?.filter((c: any) => c.trading_type === 'PLACING' && (c.status === 'ACTIVE' || c.status === 'PENDING' || c.status === 'DRAFT')).length || 0;
        const linkedContractCount = (j as any).linked_contract ? 1 : 0;
        return sum + assignedApps + placementContracts + linkedContractCount;
    }, 0);

    const startedJobs = jobs.filter(j =>
        j.job_applications?.some(app => app.actual_work_start !== null)
    ).length;

    const completedJobs = jobs.filter(j =>
        j.status === "COMPLETED" ||
        (j.job_applications?.length > 0 && j.job_applications.every((app: any) => (app.reports?.length || 0) > 0))
    ).length;

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground mt-2">{description}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-6 bg-white rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">全案件数</p>
                                <p className="text-2xl font-bold mt-1">{totalJobs} <span className="text-sm font-normal text-muted-foreground">件</span></p>
                            </div>
                            <Briefcase className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
                    </div>
                    <div className="p-6 bg-white rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">配置状況</p>
                                <p className="text-2xl font-bold mt-1">{assignedCount} / {totalMaxWorkers} <span className="text-sm font-normal text-muted-foreground">名</span></p>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div
                                        className="bg-green-500 h-full transition-all duration-500"
                                        style={{ width: `${totalMaxWorkers > 0 ? (assignedCount / totalMaxWorkers) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                            <Users className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                    </div>
                    <div className="p-6 bg-white rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">開始済み案件</p>
                                <p className="text-2xl font-bold mt-1">{startedJobs} <span className="text-sm font-normal text-muted-foreground">件</span></p>
                            </div>
                            <Clock className="w-8 h-8 text-orange-500 opacity-20" />
                        </div>
                    </div>
                    <div className="p-6 bg-white rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">完了済み案件</p>
                                <p className="text-2xl font-bold mt-1">{completedJobs} <span className="text-sm font-normal text-muted-foreground">件</span></p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <JobFilters onFilterChange={handleFilterChange} clients={clients} />

                {/* Jobs Table */}
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <JobsTable
                        jobs={filteredJobs}
                        onStatusChange={handleStatusChange}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        processingId={processingId}
                    />
                )}

                {/* Modals */}
                <BulkJobCreateModal isOpen={isBulkModalOpen} onClose={() => { setIsBulkModalOpen(false); fetchData(); }} />
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
