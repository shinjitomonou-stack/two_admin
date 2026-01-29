"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Plus, MapPin, Calendar, Eye, Edit, Users, Copy, Trash2, Loader2, Briefcase, CheckCircle, FileText } from "lucide-react";
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
import BulkJobUpdateModal from "@/components/BulkJobUpdateModal";
import { JobCopyDialog } from "@/components/JobCopyDialog";
import { FileUp, Download, FileEdit } from "lucide-react";

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
    const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [jobToCopy, setJobToCopy] = useState<{ id: string; title: string; address_text: string; assignedWorkerIds: string[]; start_time: string; end_time: string } | null>(null);
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
                ),
                report_templates (
                    id,
                    name
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
            const keywords = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
            filtered = filtered.filter(job => {
                return keywords.every(kw => {
                    // Job title etc.
                    if (job.title?.toLowerCase().includes(kw)) return true;
                    if (job.clients?.name?.toLowerCase().includes(kw)) return true;
                    if (job.address_text?.toLowerCase().includes(kw)) return true;

                    // Workers
                    const hasWorkerMatch = job.job_applications?.some((app: any) => {
                        const fullName = app.workers?.full_name?.toLowerCase() || "";
                        const nameKana = app.workers?.name_kana?.toLowerCase() || "";
                        return fullName.includes(kw) || nameKana.includes(kw);
                    });
                    if (hasWorkerMatch) return true;

                    // Partners
                    const hasPartnerMatch = (job as any).client_job_contracts?.some((c: any) =>
                        c.clients?.name?.toLowerCase().includes(kw)
                    );
                    if (hasPartnerMatch) return true;

                    const hasLinkedPartnerMatch = (job as any).linked_contract?.clients?.name?.toLowerCase().includes(kw);
                    if (hasLinkedPartnerMatch) return true;

                    return false;
                });
            });
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

    const handleExportCSV = () => {
        const headers = "id,title,client_name,is_flexible,date,period_start,period_end,start_time,end_time,reward_amount,reward_tax_mode,billing_amount,billing_tax_mode,max_workers,address_text,description,template_name,auto_set_schedule,status";

        const rows = filteredJobs.map(job => {
            const isFlex = job.is_flexible ? "はい" : "いいえ";
            const date = !job.is_flexible && job.start_time ? new Date(job.start_time).toISOString().split('T')[0] : "";
            const periodStart = job.work_period_start ? job.work_period_start.split('T')[0] : "";
            const periodEnd = job.work_period_end ? job.work_period_end.split('T')[0] : "";
            const startTime = !job.is_flexible && job.start_time ? new Date(job.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }) : "";
            const endTime = !job.is_flexible && job.end_time ? new Date(job.end_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }) : "";

            const clientName = job.clients?.name || "";
            const templateName = job.report_templates?.name || "";

            const rewardExport = job.reward_tax_mode === 'INCL' ? Math.round(job.reward_amount * 1.1) : job.reward_amount;
            const billingExport = (job.billing_amount && job.billing_tax_mode === 'INCL') ? Math.round(job.billing_amount * 1.1) : job.billing_amount;

            const fields = [
                job.id,
                job.title,
                clientName,
                isFlex,
                date,
                periodStart,
                periodEnd,
                startTime,
                endTime,
                rewardExport,
                job.reward_tax_mode === 'INCL' ? '税込' : '税抜',
                billingExport || "",
                job.billing_tax_mode === 'INCL' ? '税込' : '税抜',
                job.max_workers,
                job.address_text || "",
                job.description || "",
                templateName,
                job.auto_set_schedule ? "はい" : "いいえ",
                job.status
            ];

            return fields.map(f => `"${String(f || "").replace(/"/g, '""')}"`).join(",");
        });

        const csvContent = `${headers}\n${rows.join("\n")}`;
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `jobs_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
        toast.success("CSVを出力しました。");
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

    // Stats Calculation (consistent with JobsDashboardView)
    const totalJobsCount = filteredJobs.length;
    const totalMaxWorkers = filteredJobs.reduce((sum, j) => sum + j.max_workers, 0);
    const assignedCount = filteredJobs.reduce((sum, j) => {
        const assignedApps = j.job_applications?.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED") || [];
        const placementContracts = (j as any).client_job_contracts?.filter((c: any) =>
            c.trading_type === 'PLACING' &&
            (c.status === 'ACTIVE' || c.status === 'PENDING' || c.status === 'DRAFT')
        ) || [];
        const linkedContract = (j as any).linked_contract;

        let count = assignedApps.length;
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

    const submittedReportsCount = filteredJobs.reduce((sum, j) => {
        const reports = j.job_applications?.flatMap(app => app.reports || []) || [];
        return sum + reports.length;
    }, 0);

    const approvedReportsCount = filteredJobs.reduce((sum, j) => {
        const reports = j.job_applications?.flatMap(app => app.reports || []) || [];
        const approved = reports.filter((r: any) => r.status === 'APPROVED');
        return sum + approved.length;
    }, 0);

    const completedJobsCount = filteredJobs.filter(j => {
        if (j.status === "COMPLETED") return true;
        const assignedApps = j.job_applications?.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED") || [];
        if (assignedApps.length === 0) return false;
        return assignedApps.every((app: any) => (app.reports?.length || 0) > 0);
    }).length;

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
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm text-sm"
                        >
                            <Download className="w-4 h-4" />
                            CSV出力
                        </button>
                        <button
                            onClick={() => setIsBulkUpdateModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors font-medium shadow-sm text-sm"
                        >
                            <FileEdit className="w-4 h-4" />
                            一括更新
                        </button>
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm text-sm"
                        >
                            <FileUp className="w-4 h-4" />
                            一括登録
                        </button>
                        <Link
                            href="/jobs/create?returnTo=/jobs"
                            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            新規作成
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-5">
                    <div className="p-6 bg-white rounded-xl border border-border shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">表示中案件</p>
                                <p className="text-2xl font-bold mt-1">{totalJobsCount} <span className="text-sm font-normal text-muted-foreground">件</span></p>
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
                                <p className="text-2xl font-bold mt-1">{completedJobsCount} <span className="text-sm font-normal text-muted-foreground">件</span></p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
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
                <BulkJobUpdateModal
                    isOpen={isBulkUpdateModalOpen}
                    onClose={() => {
                        setIsBulkUpdateModalOpen(false);
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
                        defaultStartDate={jobToCopy.start_time}
                        defaultEndDate={jobToCopy.end_time}
                        assignedWorkerIds={jobToCopy.assignedWorkerIds}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
