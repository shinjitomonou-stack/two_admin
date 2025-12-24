"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FileText, CheckCircle, XCircle, Clock, Filter, ArrowLeft, Eye, Edit, Search, X } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import AdminLayout from "@/components/layout/AdminLayout";

const ITEMS_PER_PAGE = 100;

type Report = {
    id: string;
    status: string;
    created_at: string;
    work_start_at: string;
    work_end_at: string;
    job_applications: {
        job_id: string;
        worker_id: string;
        jobs: {
            title: string;
        };
        workers: {
            full_name: string;
        };
    };
};

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [filteredReports, setFilteredReports] = useState<Report[]>([]);
    const [paginatedReports, setPaginatedReports] = useState<Report[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
    const supabase = createClient();

    useEffect(() => {
        fetchReports();
    }, []);

    useEffect(() => {
        let filtered = reports;

        // Status filter
        if (statusFilter !== "ALL") {
            filtered = filtered.filter(r => r.status === statusFilter);
        }

        // Search query (worker name or job title)
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                (r.job_applications?.jobs?.title || "").toLowerCase().includes(lowerQuery) ||
                (r.job_applications?.workers?.full_name || "").toLowerCase().includes(lowerQuery)
            );
        }

        // Date range filter
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(r => new Date(r.created_at) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(r => new Date(r.created_at) <= end);
        }

        setFilteredReports(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    }, [statusFilter, startDate, endDate, searchQuery, reports]);

    // Update paginated reports when filteredReports or currentPage changes
    useEffect(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        setPaginatedReports(filteredReports.slice(startIndex, endIndex));
    }, [filteredReports, currentPage]);

    const fetchReports = async () => {
        const { data, error } = await supabase
            .from("reports")
            .select(`
                id,
                status,
                created_at,
                work_start_at,
                work_end_at,
                job_applications (
                    job_id,
                    worker_id,
                    jobs (
                        title
                    ),
                    workers (
                        full_name
                    )
                )
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching reports:", error);
        } else {
            setReports((data as any) || []);
        }
        setIsLoading(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SUBMITTED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock className="w-3 h-3" />
                        提出済み
                    </span>
                );
            case "APPROVED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" />
                        承認済み
                    </span>
                );
            case "REJECTED":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3" />
                        差し戻し
                    </span>
                );
            default:
                return <span className="text-xs text-gray-500">{status}</span>;
        }
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo"
        });
    };

    const stats = {
        total: reports.length,
        submitted: reports.filter(r => r.status === "SUBMITTED").length,
        approved: reports.filter(r => r.status === "APPROVED").length,
        rejected: reports.filter(r => r.status === "REJECTED").length,
    };

    return (
        <AdminLayout>
            <div className="pb-20">
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Link
                            href="/jobs"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900">作業報告一覧</h1>
                    </div>
                    <p className="text-sm text-slate-600 ml-14">ワーカーから提出された作業報告を確認・承認できます。</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">全報告</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">提出済み</div>
                        <div className="text-2xl font-bold text-blue-900">{stats.submitted}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                        <div className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">承認済み</div>
                        <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                        <div className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">差し戻し</div>
                        <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-6">
                    <div className="flex flex-wrap items-end gap-6">
                        {/* Search */}
                        <div className="flex-1 min-w-[300px]">
                            <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-tight">検索</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="案件名、ワーカー名で検索..."
                                    className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 rounded-full transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-2 block uppercase tracking-tight">ステータス</label>
                            <div className="flex p-1 bg-slate-100 rounded-lg gap-1 border border-slate-200">
                                {[
                                    { id: "ALL", label: "すべて", color: "bg-white text-slate-900 shadow-sm" },
                                    { id: "SUBMITTED", label: "提出済", color: "bg-blue-600 text-white" },
                                    { id: "APPROVED", label: "承認済", color: "bg-green-600 text-white" },
                                    { id: "REJECTED", label: "回答済", color: "bg-red-600 text-white" }
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setStatusFilter(s.id)}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${statusFilter === s.id ? s.color : "text-slate-500 hover:text-slate-900"}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                        {/* Date Range */}
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-tight">提出期間</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    />
                                    <span className="text-slate-400 text-sm font-medium">〜</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    />
                                </div>
                            </div>
                            {(startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className="mt-6 px-3 py-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-tight"
                                >
                                    期間クリア
                                </button>
                            )}
                        </div>

                        {(statusFilter !== "ALL" || searchQuery || startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setStatusFilter("ALL");
                                    setSearchQuery("");
                                    setStartDate("");
                                    setEndDate("");
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                                すべての条件をリセット
                            </button>
                        )}
                    </div>
                </div>

                {/* Reports List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 space-y-4">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-medium text-slate-500 italic">報告を読み込み中...</p>
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                            <div className="p-4 bg-slate-100 rounded-full">
                                <FileText className="w-10 h-10 text-slate-300" />
                            </div>
                            <div>
                                <p className="text-slate-900 font-bold">報告が見つかりませんでした</p>
                                <p className="text-sm text-slate-500">条件を変えて再度お試しください。</p>
                            </div>
                            {(statusFilter !== "ALL" || searchQuery || startDate || endDate) && (
                                <button
                                    onClick={() => {
                                        setStatusFilter("ALL");
                                        setSearchQuery("");
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all"
                                >
                                    フィルターを解除
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto max-h-[calc(100vh-25rem)]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">案件名 / クライアント</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ワーカー</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">作業日時</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">提出日時</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ステータス</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedReports.map((report) => (
                                            <tr key={report.id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {report.job_applications?.jobs?.title || "-"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                            {report.job_applications?.workers?.full_name?.charAt(0) || "W"}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">
                                                            {report.job_applications?.workers?.full_name || "ワーカー不明"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs font-medium text-slate-900">
                                                        {formatDateTime(report.work_start_at)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                        〜 {formatDateTime(report.work_end_at).split(" ")[1]}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-xs font-medium text-slate-600">
                                                        {formatDateTime(report.created_at)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(report.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <Link
                                                            href={`/reports/${report.id}`}
                                                            className="p-2 hover:bg-white hover:shadow-sm hover:text-blue-600 rounded-lg transition-all"
                                                            title="詳細を確認"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>
                                                        <Link
                                                            href={`/reports/${report.id}/edit`}
                                                            className="p-2 hover:bg-white hover:shadow-sm hover:text-green-600 rounded-lg transition-all"
                                                            title="編集"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                                {totalPages > 1 && (
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                )}
                                <div className="mt-4 text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        全 {filteredReports.length} 件を表示中
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
