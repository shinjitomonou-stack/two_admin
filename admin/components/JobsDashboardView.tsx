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
import { Briefcase, Users, CheckCircle, FileText, Loader2 } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";

interface JobsDashboardViewProps {
    title: string;
    description: string;
    targetDateStr: string; // YYYY-MM-DD
}

export function JobsDashboardView({ title, description, targetDateStr }: JobsDashboardViewProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
    const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [jobToCopy, setJobToCopy] = useState<{ id: string; title: string; address_text: string; assignedWorkerIds: string[]; start_time: string; end_time: string } | null>(null);
    const [currentFilters, setCurrentFilters] = useState<FilterState>({
        search: "",
        status: [],
        clientId: "",
        dateFrom: "",
        dateTo: "",
    });

    const router = useRouter();
    const supabase = createClient();


    const fetchData = async () => {
        setLoading(true);

        // Construct JST Start/End times
        // targetDateStr is "YYYY-MM-DD"
        // Start: YYYY-MM-DDT00:00:00+09:00 (JST midnight) -> Converted to UTC by ISOString (automatically handles offset)
        // End: YYYY-MM-DDT23:59:59.999+09:00 (JST end of day)

        const startOfDay = new Date(`${targetDateStr}T00:00:00+09:00`);
        const endOfDay = new Date(`${targetDateStr}T23:59:59.999+09:00`);

        const [jobsRes, clientsRes] = await Promise.all([
            supabase.from("jobs").select(`
                *,
                clients(id, name),
                job_applications(
                    id,
                    status,
                    scheduled_work_start,
                    actual_work_start,
                    workers(full_name, name_kana),
                    worker_id,
                    reports(id, status)
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
        }

        if (clientsRes.data) {
            setClients(clientsRes.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [targetDateStr]);

    useEffect(() => {
        let filtered = [...jobs];
        const filters = currentFilters;

        if (filters.search) {
            const keywords = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter(j => {
                return keywords.every(kw => {
                    // Job title
                    if (j.title?.toLowerCase().includes(kw)) return true;

                    // Client name
                    if (j.clients?.name?.toLowerCase().includes(kw)) return true;

                    // Address
                    if (j.address_text?.toLowerCase().includes(kw)) return true;

                    // Directly assigned workers
                    const hasWorkerMatch = j.job_applications?.some((app: any) => {
                        const fullName = app.workers?.full_name?.toLowerCase() || "";
                        const nameKana = app.workers?.name_kana?.toLowerCase() || "";
                        return fullName.includes(kw) || nameKana.includes(kw);
                    });
                    if (hasWorkerMatch) return true;

                    // Partner companies (業者)
                    const hasPartnerMatch = (j as any).client_job_contracts?.some((c: any) =>
                        c.clients?.name?.toLowerCase().includes(kw)
                    );
                    if (hasPartnerMatch) return true;

                    const hasLinkedPartnerMatch = (j as any).linked_contract?.clients?.name?.toLowerCase().includes(kw);
                    if (hasLinkedPartnerMatch) return true;

                    return false;
                });
            });
        }
        if (filters.status.length > 0) {
            filtered = filtered.filter(j => filters.status.includes(j.status));
        }
        if (filters.clientId) {
            filtered = filtered.filter(j => (j as any).clients?.id === filters.clientId || (j as any).client_id === filters.clientId);
        }
        setFilteredJobs(filtered);
    }, [jobs, currentFilters]);

    const handleFilterChange = (filters: FilterState) => {
        setCurrentFilters(filters);
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
            start_time: job.start_time,
            end_time: job.end_time,
        });
        setIsCopyDialogOpen(true);
    };

    const handleCopySubmit = async (data: { title: string; address_text: string; workerIds: string[]; start_time?: string; end_time?: string }) => {
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
        const assignedApps = j.job_applications?.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED") || [];
        const placementContracts = (j as any).client_job_contracts?.filter((c: any) =>
            c.trading_type === 'PLACING' &&
            (c.status === 'ACTIVE' || c.status === 'PENDING' || c.status === 'DRAFT')
        ) || [];
        const linkedContract = (j as any).linked_contract;

        // Start with individual workers
        let count = assignedApps.length;

        // Add placement contracts, ensuring no double counting if linked_contract is already in placementContracts
        const placementIds = new Set(placementContracts.map((c: any) => c.id));
        count += placementContracts.length;

        if (linkedContract &&
            (linkedContract.status === 'ACTIVE' || linkedContract.status === 'PENDING' || linkedContract.status === 'DRAFT') &&
            !placementIds.has(linkedContract.id)
        ) {
            count += 1;
        }

        return sum + count;
    }, 0);

    // 作業報告提出件数（ステータス問わず）
    const submittedReportsCount = jobs.reduce((sum, j) => {
        const reports = j.job_applications?.flatMap(app => app.reports || []) || [];
        return sum + reports.length;
    }, 0);

    // 承認済み報告件数
    const approvedReportsCount = jobs.reduce((sum, j) => {
        const reports = j.job_applications?.flatMap(app => app.reports || []) || [];
        const approved = reports.filter((r: any) => r.status === 'APPROVED');
        return sum + approved.length;
    }, 0);

    const completedJobs = jobs.filter(j => {
        if (j.status === "COMPLETED") return true;
        const assignedApps = j.job_applications?.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED") || [];
        if (assignedApps.length === 0) return false;
        return assignedApps.every((app: any) => (app.reports?.length || 0) > 0);
    }).length;

    return (
        <AdminLayout>
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground mt-2">{description}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-5">
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
                                <p className="text-sm font-medium text-muted-foreground">作業報告提出</p>
                                <p className="text-2xl font-bold mt-1">{submittedReportsCount} <span className="text-sm font-normal text-muted-foreground">件</span></p>
                            </div>
                            <FileText className="w-8 h-8 text-purple-500 opacity-20" />
                        </div>
                    </div>
                    <div className="p-6 bg-white rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">承認済み報告</p>
                                <p className="text-2xl font-bold mt-1">{approvedReportsCount} <span className="text-sm font-normal text-muted-foreground">件</span></p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
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
                        defaultStartDate={jobToCopy.start_time}
                        defaultEndDate={jobToCopy.end_time}
                        assignedWorkerIds={jobToCopy.assignedWorkerIds}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
