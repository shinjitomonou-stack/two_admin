"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Briefcase, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const STATUS_STYLES = {
    APPLIED: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        icon: "📋",
        label: "応募中"
    },
    ASSIGNED: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: "✓",
        label: "確定済み"
    },
    CONFIRMED: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: "✓",
        label: "確定済み"
    },
    COMPLETED: {
        bg: "bg-slate-100",
        text: "text-slate-700",
        icon: "✓",
        label: "完了"
    },
    REJECTED: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: "✗",
        label: "不採用"
    },
    CANCELLED: {
        bg: "bg-orange-100",
        text: "text-orange-700",
        icon: "✗",
        label: "キャンセル"
    }
};

type StatusKey = keyof typeof STATUS_STYLES;

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        applyFiltersAndSort();
    }, [applications, statusFilter, sortBy]);

    const fetchApplications = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("job_applications")
            .select(`
        id,
        status,
        created_at,
        scheduled_work_start,
        scheduled_work_end,
        actual_work_start,
        actual_work_end,
        jobs(
          id,
          title,
          reward_amount,
          address_text,
          clients(name)
        ),
        reports(id, status)
      `)
            .eq("worker_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching applications:", error);
        } else {
            setApplications(data || []);
        }
        setLoading(false);
    };

    const applyFiltersAndSort = () => {
        let filtered = [...applications];

        // Apply status filter
        if (statusFilter !== "all") {
            if (statusFilter === "confirmed") {
                filtered = filtered.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED");
            } else if (statusFilter === "rejected") {
                filtered = filtered.filter(app => app.status === "REJECTED" || app.status === "CANCELLED");
            } else {
                filtered = filtered.filter(app => app.status === statusFilter.toUpperCase());
            }
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case "newest":
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case "oldest":
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case "reward_high":
                    const jobA = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
                    const jobB = Array.isArray(b.jobs) ? b.jobs[0] : b.jobs;
                    return (jobB?.reward_amount || 0) - (jobA?.reward_amount || 0);
                case "reward_low":
                    const jobA2 = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
                    const jobB2 = Array.isArray(b.jobs) ? b.jobs[0] : b.jobs;
                    return (jobA2?.reward_amount || 0) - (jobB2?.reward_amount || 0);
                default:
                    return 0;
            }
        });

        setFilteredApplications(filtered);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                    <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h1 className="font-bold text-lg text-slate-900">応募履歴</h1>
                    </div>
                </header>
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-500">読み込み中...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <h1 className="font-bold text-lg text-slate-900">応募履歴</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-4">
                {/* Filters */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="space-y-3">
                        {/* Status Filter */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-2 block">ステータス</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setStatusFilter("all")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === "all"
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                >
                                    すべて
                                </button>
                                <button
                                    onClick={() => setStatusFilter("applied")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === "applied"
                                            ? "bg-blue-600 text-white"
                                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                        }`}
                                >
                                    応募中
                                </button>
                                <button
                                    onClick={() => setStatusFilter("confirmed")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === "confirmed"
                                            ? "bg-green-600 text-white"
                                            : "bg-green-100 text-green-700 hover:bg-green-200"
                                        }`}
                                >
                                    確定済み
                                </button>
                                <button
                                    onClick={() => setStatusFilter("completed")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === "completed"
                                            ? "bg-slate-600 text-white"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                >
                                    完了
                                </button>
                                <button
                                    onClick={() => setStatusFilter("rejected")}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === "rejected"
                                            ? "bg-red-600 text-white"
                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                        }`}
                                >
                                    不採用
                                </button>
                            </div>
                        </div>

                        {/* Sort */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 mb-2 block">並び替え</label>
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-3 py-2 pr-8 rounded-md border border-slate-200 bg-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-400"
                                >
                                    <option value="newest">新しい順</option>
                                    <option value="oldest">古い順</option>
                                    <option value="reward_high">報酬が高い順</option>
                                    <option value="reward_low">報酬が低い順</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                    {filteredApplications.length}件の応募
                </div>

                {/* Applications List */}
                <div className="space-y-3">
                    {filteredApplications.map((application) => {
                        const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
                        const client = job?.clients ? (Array.isArray(job.clients) ? job.clients[0] : job.clients) : null;
                        const report = application.reports && application.reports.length > 0 ? application.reports[0] : null;
                        const statusStyle = STATUS_STYLES[application.status as StatusKey] || STATUS_STYLES.APPLIED;

                        return (
                            <Link
                                key={application.id}
                                href={`/jobs/${job?.id}`}
                                className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                            >
                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                        <span>{statusStyle.icon}</span>
                                        {statusStyle.label}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {formatDate(application.created_at)}
                                    </span>
                                </div>

                                {/* Job Info */}
                                <h3 className="font-bold text-slate-900 mb-1">{job?.title}</h3>
                                {client && (
                                    <p className="text-sm text-slate-600 mb-3">{client.name}</p>
                                )}

                                {/* Details */}
                                <div className="space-y-2">
                                    {/* Scheduled/Actual Work Time */}
                                    {(application.status === "ASSIGNED" || application.status === "CONFIRMED") && application.scheduled_work_start && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar className="w-4 h-4" />
                                            <span>作業予定: {formatDate(application.scheduled_work_start)}</span>
                                        </div>
                                    )}
                                    {application.status === "COMPLETED" && application.actual_work_start && (
                                        <div className="flex items-center gap-2 text-sm text-green-600">
                                            <Calendar className="w-4 h-4" />
                                            <span>実施日: {formatDate(application.actual_work_start)}</span>
                                        </div>
                                    )}

                                    {/* Location */}
                                    {job?.address_text && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <MapPin className="w-4 h-4" />
                                            <span className="truncate">{job.address_text}</span>
                                        </div>
                                    )}

                                    {/* Reward */}
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <Briefcase className="w-4 h-4" />
                                        <span>報酬: ¥{job?.reward_amount?.toLocaleString()}</span>
                                    </div>

                                    {/* Report Status */}
                                    {application.status === "COMPLETED" && (
                                        <div className="pt-2 border-t border-slate-100">
                                            {report ? (
                                                <span className="text-xs text-blue-600">📋 報告済み</span>
                                            ) : (
                                                <span className="text-xs text-orange-600">📋 報告待ち</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}

                    {filteredApplications.length === 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                            <p className="text-slate-500 mb-4">
                                {statusFilter === "all"
                                    ? "応募履歴がありません"
                                    : "該当する応募がありません"}
                            </p>
                            {statusFilter !== "all" && (
                                <button
                                    onClick={() => setStatusFilter("all")}
                                    className="text-blue-600 text-sm font-medium hover:underline"
                                >
                                    すべて表示
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
