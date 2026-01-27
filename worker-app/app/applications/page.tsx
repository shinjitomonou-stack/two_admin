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
                // DB always stores tax-excluded amount regardless of tax mode setting in Admin
                const reward = Math.round(baseAmount * 1.1);

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

                <div className="flex px-4 pt-2 pb-0 gap-2 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab(TABS.SCHEDULE)}
                        className={`flex-1 py-2 px-3 text-sm font-bold rounded-full transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === TABS.SCHEDULE ? "bg-slate-900 text-white shadow-md transform scale-[1.02]" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
                    >
                        予定
                        {scheduleItems.length > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === TABS.SCHEDULE ? "bg-white text-slate-900" : "bg-slate-100 text-slate-600"}`}>
                                {scheduleItems.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab(TABS.HISTORY)}
                        className={`flex-1 py-2 px-3 text-sm font-bold rounded-full transition-all whitespace-nowrap ${activeTab === TABS.HISTORY ? "bg-slate-900 text-white shadow-md transform scale-[1.02]" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
                    >
                        履歴・報酬
                    </button>
                    <button
                        onClick={() => setActiveTab(TABS.APPLIED)}
                        className={`flex-1 py-2 px-3 text-sm font-bold rounded-full transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === TABS.APPLIED ? "bg-slate-900 text-white shadow-md transform scale-[1.02]" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
                    >
                        応募中
                        {appliedItems.length > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === TABS.APPLIED ? "bg-white text-slate-900" : "bg-slate-100 text-slate-600"}`}>
                                {appliedItems.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <main className="p-4 space-y-4">

                {/* --- SCHEDULE TAB --- */}
                {activeTab === TABS.SCHEDULE && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                            <h2 className="font-bold text-slate-900">確定した予定 ({scheduleItems.length})</h2>
                        </div>
                        {scheduleItems.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm font-medium">現在、確定している予定はありません</p>
                                <p className="text-xs text-slate-400 mt-1">新しいお仕事に応募してみましょう</p>
                            </div>
                        ) : (
                            scheduleItems.map((app) => {
                                const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
                                return (
                                    <Link key={app.id} href={`/jobs/${job?.id}?returnTo=/applications`} className="group block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200">
                                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                                <Calendar className="w-4 h-4 text-blue-600" />
                                                <span>{formatDate(app.scheduled_work_start)}</span>
                                            </div>
                                            <div className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
                                                予定
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <h3 className="font-bold text-slate-900 mb-3 text-lg leading-snug group-hover:text-blue-600 transition-colors">{job?.title}</h3>
                                            <div className="space-y-2.5 text-sm text-slate-600 mb-4">
                                                {job?.address_text && (
                                                    <div className="flex items-start gap-2.5">
                                                        <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                                                        <span className="line-clamp-1">{job.address_text}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-4 flex justify-center shrink-0">
                                                        <span className="text-slate-400 font-serif">¥</span>
                                                    </div>
                                                    <span className="font-bold text-slate-900 text-base">
                                                        {Math.round(job?.reward_amount || 0).toLocaleString()}
                                                        <span className="text-[10px] font-normal text-slate-400 ml-1">(税込)</span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end text-blue-600 text-sm font-bold group-hover:gap-1 transition-all">
                                                詳細を見る <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                            {/* Decorator */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" />
                                        報酬サマリー
                                    </h2>
                                    <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                                        {new Date().getMonth() + 1}月度
                                    </span>
                                </div>
                                <div className="mb-6">
                                    <div className="text-xs font-medium text-slate-400 mb-1">今月の獲得報酬 (税込)</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-normal opacity-70">¥</span>
                                        <span className="text-4xl font-bold tracking-tight">{Math.round(monthlyReward).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400">累計獲得報酬</span>
                                    </div>
                                    <div className="text-lg font-bold">¥{Math.round(totalReward).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* History List */}
                        <div>
                            <h3 className="font-bold text-slate-900 mb-4 px-1 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                作業履歴
                            </h3>
                            {historyItems.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                    <p className="text-slate-500 text-sm font-medium">まだ履歴はありません</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historyItems.map((app) => {
                                        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
                                        const isCompleted = job?.status === 'COMPLETED' || app.status === 'COMPLETED';
                                        const dateLabel = isCompleted ? formatDate(app.actual_work_end) : formatDate(app.created_at);
                                        const statusLabel = isCompleted ? '完了' : app.status === 'REJECTED' ? '不採用' : 'キャンセル';

                                        // Status styles
                                        let statusStyles = 'bg-slate-100 text-slate-500';
                                        let statusIcon = <Clock className="w-4 h-4" />;

                                        if (isCompleted) {
                                            statusStyles = 'bg-green-100 text-green-700 border border-green-200';
                                            statusIcon = <CheckCircle className="w-4 h-4" />;
                                        } else if (app.status === 'REJECTED') {
                                            statusStyles = 'bg-red-50 text-red-600 border border-red-100';
                                            statusIcon = <div className="w-1.5 h-1.5 rounded-full bg-red-500" />;
                                        } else if (app.status === 'CANCELLED') {
                                            statusStyles = 'bg-slate-100 text-slate-500 border border-slate-200';
                                            statusIcon = <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />;
                                        }

                                        return (
                                            <Link key={app.id} href={`/jobs/${job?.id}?returnTo=/applications`} className="group block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {dateLabel}
                                                    </div>
                                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusStyles}`}>
                                                        {statusIcon}
                                                        {statusLabel}
                                                    </div>
                                                </div>

                                                <h4 className="font-bold text-slate-900 text-base mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                                                    {job?.title}
                                                </h4>

                                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span className="line-clamp-1 max-w-[120px]">{job?.address_text || "場所未定"}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-slate-400 font-medium mb-0.5">報酬 (税込)</span>
                                                        <span className={`text-lg font-bold ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                                                            ¥{Math.round(
                                                                (job?.reward_amount || 0) * 1.1
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
                        <div className="flex items-center gap-2 px-1">
                            <span className="w-1 h-4 bg-slate-400 rounded-full"></span>
                            <h2 className="font-bold text-slate-900">選考中の案件 ({appliedItems.length})</h2>
                        </div>
                        {appliedItems.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                <p className="text-slate-500 text-sm font-medium">現在応募中の案件はありません</p>
                            </div>
                        ) : (
                            appliedItems.map((app) => {
                                const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
                                return (
                                    <Link key={app.id} href={`/jobs/${job?.id}?returnTo=/applications`} className="group block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs text-slate-500 font-medium">応募日: {formatDate(app.created_at)}</span>
                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200">選考中</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900 mb-3 text-lg leading-snug group-hover:text-blue-600 transition-colors">{job?.title}</h3>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                            <span className="text-xs font-bold text-slate-400">予定報酬</span>
                                            <span className="font-bold text-slate-900">¥{Math.round(job?.reward_amount || 0).toLocaleString()}</span>
                                            <span className="text-[10px] text-slate-400">(税込)</span>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed flex gap-3">
                            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-blue-600 font-bold">i</div>
                            <p className="pt-0.5">採用結果はメールまたはLINEで通知されます。選考には数日かかる場合がありますのでご了承ください。</p>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
