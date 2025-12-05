"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FileText, CheckCircle, XCircle, Clock, Filter, ArrowLeft, Eye, Edit } from "lucide-react";
import Pagination from "@/components/ui/Pagination";

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
    }, [statusFilter, startDate, endDate, reports]);

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
        <div className="p-6 max-w-7xl mx-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                    <div className="text-sm text-slate-600 mb-1">全報告</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-700 mb-1">提出済み</div>
                    <div className="text-2xl font-bold text-blue-900">{stats.submitted}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700 mb-1">承認済み</div>
                    <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-sm text-red-700 mb-1">差し戻し</div>
                    <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">フィルター</span>
                </div>

                {/* Status Filter */}
                <div className="mb-4">
                    <label className="text-xs font-medium text-slate-600 mb-2 block">ステータス</label>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setStatusFilter("ALL")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === "ALL"
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                        >
                            すべて
                        </button>
                        <button
                            onClick={() => setStatusFilter("SUBMITTED")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === "SUBMITTED"
                                ? "bg-blue-600 text-white"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                        >
                            提出済み
                        </button>
                        <button
                            onClick={() => setStatusFilter("APPROVED")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === "APPROVED"
                                ? "bg-green-600 text-white"
                                : "bg-green-50 text-green-700 hover:bg-green-100"
                                }`}
                        >
                            承認済み
                        </button>
                        <button
                            onClick={() => setStatusFilter("REJECTED")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === "REJECTED"
                                ? "bg-red-600 text-white"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                                }`}
                        >
                            差し戻し
                        </button>
                    </div>
                </div>

                {/* Date Range Filter */}
                <div>
                    <label className="text-xs font-medium text-slate-600 mb-2 block">提出期間</label>
                    <div className="flex gap-3 items-center flex-wrap">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-500">〜</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                }}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 underline"
                            >
                                期間クリア
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">読み込み中...</div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        {statusFilter === "ALL" ? "報告がありません" : `${statusFilter === "SUBMITTED" ? "提出済み" : statusFilter === "APPROVED" ? "承認済み" : "差し戻し"}の報告がありません`}
                    </div>
                ) : (
                    <>
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">案件名</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">ワーカー</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">作業日時</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">提出日時</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">ステータス</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-900">
                                            {report.job_applications?.jobs?.title || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-900">
                                            {report.job_applications?.workers?.full_name || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {formatDateTime(report.work_start_at)}
                                            <br />
                                            <span className="text-xs">〜 {formatDateTime(report.work_end_at)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {formatDateTime(report.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getStatusBadge(report.status)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/reports/${report.id}`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600"
                                                    title="詳細"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/reports/${report.id}/edit`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-green-600"
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
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
