"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Calendar, MapPin, Briefcase, ChevronRight, Clock, CheckCircle } from "lucide-react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const TABS = {
    SCHEDULE: "schedule",
    HISTORY: "history",
    APPLIED: "applied"
};

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(TABS.SCHEDULE);

    // Filtered data
    const [scheduleItems, setScheduleItems] = useState<any[]>([]);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [appliedItems, setAppliedItems] = useState<any[]>([]);

    // Rewards summary
    const [totalReward, setTotalReward] = useState(0);
    const [monthlyReward, setMonthlyReward] = useState(0);

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        processApplications();
    }, [applications]);

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
          status,
          title,
          reward_amount,
          reward_tax_mode,
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

    const processApplications = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Schedule (Future & Active) - ASSIGNED, CONFIRMED
        const schedule = applications.filter(app =>
            app.status === 'ASSIGNED' || app.status === 'CONFIRMED'
        ).sort((a, b) => {
            // Sort by scheduled start date (ascending)
            const dateA = a.scheduled_work_start ? new Date(a.scheduled_work_start).getTime() : 0;
            const dateB = b.scheduled_work_start ? new Date(b.scheduled_work_start).getTime() : 0;
            return dateA - dateB;
        });

        // 2. History (Completed & Cancelled/Rejected) - COMPLETED, REJECTED, CANCELLED
        const history = applications.filter(app => {
            const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
            return job?.status === 'COMPLETED' || app.status === 'COMPLETED' || app.status === 'REJECTED' || app.status === 'CANCELLED';
        }).sort((a, b) => {
            // Sort by actual work end or updated date (descending)
            const dateA = a.actual_work_end ? new Date(a.actual_work_end).getTime() : new Date(a.created_at).getTime();
            const dateB = b.actual_work_end ? new Date(b.actual_work_end).getTime() : new Date(b.created_at).getTime();
            return dateB - dateA;
        });

        // Calculate Rewards
        let total = 0;
        let monthly = 0;

        history.forEach(app => {
            const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
            const isCompleted = job?.status === 'COMPLETED' || app.status === 'COMPLETED';
            if (isCompleted) {
                // Calculate tax-inclusive reward
                const baseAmount = job?.reward_amount || 0;
                const isTaxExcluded = job?.reward_tax_mode === 'EXCL';
                const reward = isTaxExcluded ? Math.round(baseAmount * 1.1) : baseAmount;

                total += reward;

                const completedDate = app.actual_work_end ? new Date(app.actual_work_end) : null;
                if (completedDate && completedDate >= startOfMonth) {
                    monthly += reward;
                }
            }
        });

        // 3. Applied (Pending) - APPLIED
        const applied = applications.filter(app =>
            app.status === 'APPLIED'
        ).sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setScheduleItems(schedule);
        setHistoryItems(history);
        setAppliedItems(applied);
        setTotalReward(total);
        setMonthlyReward(monthly);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day}(${weekday}) ${hours}:${minutes}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-500">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 max-w-md mx-auto">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BackButton fallbackHref="/" />
                        <h1 className="font-bold text-lg text-slate-900">お仕事管理</h1>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab(TABS.SCHEDULE)}
                        className={`flex-1 py-3 text-sm font-bold relative transition-colors ${activeTab === TABS.SCHEDULE ? "text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        予定
                        {scheduleItems.length > 0 && (
                            <span className="ml-1.5 bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full inline-block align-middle mb-0.5">
                                {scheduleItems.length}
                            </span>
                        )}
                        {activeTab === TABS.SCHEDULE && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab(TABS.HISTORY)}
                        className={`flex-1 py-3 text-sm font-bold relative transition-colors ${activeTab === TABS.HISTORY ? "text-green-600" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        履歴・報酬
                        {activeTab === TABS.HISTORY && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab(TABS.APPLIED)}
                        className={`flex-1 py-3 text-sm font-bold relative transition-colors ${activeTab === TABS.APPLIED ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        応募中
                        {appliedItems.length > 0 && (
                            <span className="ml-1.5 bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full inline-block align-middle mb-0.5">
                                {appliedItems.length}
                            </span>
                        )}
                        {activeTab === TABS.APPLIED && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                        )}
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-4">

                {/* --- SCHEDULE TAB --- */}
                {activeTab === TABS.SCHEDULE && (
                    <div className="space-y-4">
                        {scheduleItems.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-slate-500 text-sm">現在、確定している予定はありません。</p>
                            </div>
                        ) : (
                            scheduleItems.map((app) => {
                                const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
                                const client = job?.clients ? (Array.isArray(job.clients) ? job.clients[0] : job.clients) : null;
                                return (
                                    <Link key={app.id} href={`/jobs/${job?.id}?returnTo=/applications`} className="block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(app.scheduled_work_start)}</span>
                                            </div>
                                            <div className="text-xs bg-white text-blue-600 px-2 py-0.5 rounded-full border border-blue-200 font-medium">
                                                予定
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-slate-900 mb-2 leading-snug">{job?.title}</h3>
                                            <div className="space-y-2 text-sm text-slate-600">
                                                {job?.address_text && (
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                                                        <span>{job.address_text}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Briefcase className="w-4 h-4 shrink-0 text-slate-400" />
                                                    <span>報酬: ¥{Math.round(job?.reward_amount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center justify-end text-blue-600 text-sm font-bold">
                                                詳細を見る <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                )}

                {/* --- HISTORY & REWARDS TAB --- */}
                {activeTab === TABS.HISTORY && (
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-green-50">報酬サマリー</h2>
                                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">今月</span>
                            </div>
                            <div className="mb-6">
                                <div className="text-sm opacity-80 mb-1">今月の報酬合計</div>
                                <div className="text-4xl font-bold tracking-tight">¥{Math.round(monthlyReward).toLocaleString()}</div>
                            </div>
                            <div className="pt-4 border-t border-white/20 flex items-center justify-between">
                                <div className="text-sm opacity-80">累計報酬</div>
                                <div className="text-lg font-bold">¥{Math.round(totalReward).toLocaleString()}</div>
                            </div>
                        </div>

                        {/* History List */}
                        <div>
                            <h3 className="font-bold text-slate-900 mb-3 text-sm">作業履歴</h3>
                            {historyItems.length === 0 ? (
                                <p className="text-center text-slate-500 text-sm py-4">履歴はありません。</p>
                            ) : (
                                <div className="space-y-3">
                                    {historyItems.map((app) => {
                                        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
                                        const isCompleted = job?.status === 'COMPLETED' || app.status === 'COMPLETED';
                                        const dateLabel = isCompleted ? formatDate(app.actual_work_start) : formatDate(app.created_at);
                                        const statusLabel = isCompleted ? '完了' : app.status === 'REJECTED' ? '不採用' : 'キャンセル';
                                        const statusColor = isCompleted ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-100';

                                        return (
                                            <Link key={app.id} href={`/jobs/${job?.id}?returnTo=/applications`} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-green-100' : 'bg-slate-100'}`}>
                                                    {isCompleted ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-slate-400" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-slate-500">{dateLabel}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                                                            {statusLabel}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 text-sm truncate mb-1">{job?.title}</h4>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-slate-500">報酬 (税込)</span>
                                                        <span className={`text-sm font-bold ${isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                                                            ¥{Math.round(
                                                                (job?.reward_amount || 0) * (job?.reward_tax_mode === 'EXCL' ? 1.1 : 1)
                                                            ).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- APPLIED TAB --- */}
                {activeTab === TABS.APPLIED && (
                    <div className="space-y-4">
                        {appliedItems.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-slate-500 text-sm">現在応募中の案件はありません。</p>
                            </div>
                        ) : (
                            appliedItems.map((app) => {
                                const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
                                return (
                                    <Link key={app.id} href={`/jobs/${job?.id}?returnTo=/applications`} className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-slate-500">応募日: {formatDate(app.created_at)}</span>
                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">選考中</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900 mb-2">{job?.title}</h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Briefcase className="w-4 h-4 text-slate-400" />
                                            <span>報酬: ¥{Math.round(job?.reward_amount || 0).toLocaleString()}</span>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                        <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-800 leading-relaxed">
                            <p>※ 採用結果はメールまたはLINEで通知されます。</p>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
