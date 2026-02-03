"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Calendar, MapPin, Briefcase, ChevronRight, Clock, CheckCircle, ChevronLeft, ArrowRight, User, TrendingUp } from "lucide-react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const TABS = {
    MANAGEMENT: "management",
    APPLIED: "applied"
};

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(TABS.MANAGEMENT);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    // Filtered data
    const [scheduleItems, setScheduleItems] = useState<any[]>([]);
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [appliedItems, setAppliedItems] = useState<any[]>([]);

    // Rewards summary
    const [monthlyCompletedReward, setMonthlyCompletedReward] = useState(0);
    const [monthlyScheduledReward, setMonthlyScheduledReward] = useState(0);

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        processApplications();
    }, [applications, selectedMonth]);

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
          start_time,
          end_time,
          is_flexible,
          work_period_start,
          work_period_end,
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

    // Helper to get the reference date for an application (for filtering and display)
    const getAppTargetDate = (app: any) => {
        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
        if (app.scheduled_work_start) return new Date(app.scheduled_work_start);
        if (job?.start_time) return new Date(job.start_time);
        if (job?.work_period_start) return new Date(job.work_period_start);
        return new Date(app.created_at);
    };

    const processApplications = () => {
        const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

        // 1. History (Completed jobs for the selected month)
        const history = applications.filter(app => {
            const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
            const isCompleted = job?.status === 'COMPLETED' || app.status === 'COMPLETED';

            if (!isCompleted) return false;

            const targetDate = getAppTargetDate(app);
            return targetDate >= startOfMonth && targetDate <= endOfMonth;
        }).sort((a, b) => {
            const dateA = getAppTargetDate(a).getTime();
            const dateB = getAppTargetDate(b).getTime();
            return dateB - dateA;
        });

        // 2. Schedule (Assigned/Confirmed and NOT completed for the selected month)
        const schedule = applications.filter(app => {
            const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
            const isCompleted = job?.status === 'COMPLETED' || app.status === 'COMPLETED';
            const isAssigned = app.status === 'ASSIGNED' || app.status === 'CONFIRMED';

            if (!isAssigned || isCompleted) return false;

            const targetDate = getAppTargetDate(app);
            return targetDate >= startOfMonth && targetDate <= endOfMonth;
        }).sort((a, b) => {
            const dateA = getAppTargetDate(a).getTime();
            const dateB = getAppTargetDate(b).getTime();
            return dateA - dateB;
        });

        // 3. Applied (Pending selection)
        const applied = applications.filter(app => app.status === 'APPLIED')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Calculate Rewards for the selected month (tax-inclusive)
        let monthlyCompleted = 0;
        let monthlyScheduled = 0;

        applications.forEach(app => {
            const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
            if (!job) return;

            const baseAmount = job.reward_amount || 0;
            const reward = Math.round(baseAmount * 1.1);

            const isCompleted = job.status === 'COMPLETED' || app.status === 'COMPLETED';
            const isAssigned = app.status === 'ASSIGNED' || app.status === 'CONFIRMED';

            const targetDate = getAppTargetDate(app);

            if (isCompleted) {
                if (targetDate >= startOfMonth && targetDate <= endOfMonth) {
                    monthlyCompleted += reward;
                }
            } else if (isAssigned) {
                if (targetDate >= startOfMonth && targetDate <= endOfMonth) {
                    monthlyScheduled += reward;
                }
            }
        });

        setScheduleItems(schedule);
        setHistoryItems(history);
        setAppliedItems(applied);
        setMonthlyCompletedReward(monthlyCompleted);
        setMonthlyScheduledReward(monthlyScheduled);
    };

    const formatDateDisplay = (app: any) => {
        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;

        // 1. Priority: scheduled_work_start
        if (app.scheduled_work_start) {
            return formatDateTime(app.scheduled_work_start);
        }

        // 2. Secondary: flexible job with period
        if (job?.is_flexible && (job?.work_period_start || job?.work_period_end)) {
            const startStr = job.work_period_start ? formatMonthDay(job.work_period_start) : "";
            const endStr = job.work_period_end ? formatMonthDay(job.work_period_end) : "";
            if (startStr && endStr) return `${startStr} 〜 ${endStr}`;
            return startStr || endStr;
        }

        // 3. Fallback: job start_time
        if (job?.start_time) {
            return formatDateTime(job.start_time);
        }

        return "日付未定";
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day}(${weekday}) ${hours}:${minutes}`;
    };

    const formatMonthDay = (dateString: string) => {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + offset);
        setSelectedMonth(newDate);
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
                        onClick={() => setActiveTab(TABS.MANAGEMENT)}
                        className={`flex-1 py-2 px-3 text-sm font-bold rounded-full transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === TABS.MANAGEMENT ? "bg-slate-900 text-white shadow-md transform scale-[1.02]" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
                    >
                        お仕事管理
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

                {/* --- MANAGEMENT TAB --- */}
                {activeTab === TABS.MANAGEMENT && (
                    <div className="space-y-6">
                        {/* Summary Card with Golden Gradient and 3D Effect */}
                        <div className="relative group">
                            {/* 3D Reflection/Shadow Layer */}
                            <div className="absolute inset-0 bg-yellow-600/20 translate-y-2 translate-x-1 rounded-[2rem] blur-xl" />

                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FFD700] via-[#fcc800] to-[#E6B800] p-6 text-slate-900 shadow-[0_10px_30px_-10px_rgba(252,200,0,0.5)] border border-white/30 backdrop-blur-sm">
                                {/* Glossy Effect */}
                                <div className="absolute top-0 left-0 w-full h-[150%] bg-gradient-to-b from-white/40 to-transparent -rotate-[35deg] -translate-y-1/2 translate-x-[-10%] pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs bg-white/30 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            今月の報酬見込
                                        </div>
                                        <div className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full shadow-lg">
                                            {selectedMonth.getFullYear()}年 {selectedMonth.getMonth() + 1}月
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xl font-bold opacity-60">¥</span>
                                            <span className="text-4xl font-black tracking-tight drop-shadow-sm">
                                                {(monthlyCompletedReward + monthlyScheduledReward).toLocaleString()}
                                            </span>
                                            <span className="text-xs font-bold opacity-60"> (税込)</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-900/10">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">完了分 (税込)</div>
                                            <div className="text-lg font-black text-slate-900">
                                                ¥{monthlyCompletedReward.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">予定分 (税込)</div>
                                            <div className="text-lg font-black text-slate-800">
                                                ¥{monthlyScheduledReward.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Month Controller */}
                        <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-slate-200 shadow-sm">
                            <button
                                onClick={() => changeMonth(-1)}
                                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <div className="font-black text-slate-900">
                                {selectedMonth.getFullYear()}年 {selectedMonth.getMonth() + 1}月
                            </div>
                            <button
                                onClick={() => changeMonth(1)}
                                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {/* History Section (Completed) */}
                        <div className="space-y-4">
                            <h3 className="font-black text-slate-900 px-1 flex items-center gap-2 text-sm uppercase tracking-widest">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                作業履歴 (完了)
                            </h3>
                            {historyItems.length === 0 ? (
                                <div className="text-center py-8 bg-white/50 rounded-2xl border border-dashed border-slate-300">
                                    <p className="text-slate-400 text-xs font-medium">この月の完了履歴はありません</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historyItems.map((app) => {
                                        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
                                        return (
                                            <Link key={app.id} href={`/jobs/${job?.id}?returnTo=/applications`} className="group block bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDateDisplay(app)}
                                                    </div>
                                                    <div className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-green-200">
                                                        完了
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-900 text-sm mb-3 leading-snug group-hover:text-amber-600 transition-colors">
                                                    {job?.title}
                                                </h4>
                                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                    <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="line-clamp-1">{job?.address_text || "場所未定"}</span>
                                                    </div>
                                                    <div className="text-sm font-black text-slate-900">
                                                        ¥{Math.round((job?.reward_amount || 0) * 1.1).toLocaleString()}
                                                        <span className="text-[9px] font-medium text-slate-400 ml-1">税込</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Scheduled Section (Remaining) */}
                        <div className="space-y-4">
                            <h3 className="font-black text-slate-900 px-1 flex items-center gap-2 text-sm uppercase tracking-widest">
                                <Clock className="w-4 h-4 text-blue-600" />
                                作業予定 (確定)
                            </h3>
                            {scheduleItems.length === 0 ? (
                                <div className="text-center py-8 bg-white/50 rounded-2xl border border-dashed border-slate-300">
                                    <p className="text-slate-400 text-xs font-medium">確定した予定はありません</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {scheduleItems.map((app) => {
                                        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;

                                        // Determine report status
                                        let reportStatusDisplay = null;
                                        if (app.reports && app.reports.length > 0) {
                                            const reports = Array.isArray(app.reports) ? app.reports : [app.reports];
                                            const sortedReports = [...reports].sort((a: any, b: any) =>
                                                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                                            );
                                            const latestReport = sortedReports[0];

                                            if (latestReport.status === 'APPROVED') {
                                                reportStatusDisplay = (
                                                    <div className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-green-200">
                                                        承認済
                                                    </div>
                                                );
                                            } else if (latestReport.status === 'REJECTED') {
                                                reportStatusDisplay = (
                                                    <div className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
                                                        差し戻し
                                                    </div>
                                                );
                                            } else if (latestReport.status === 'SUBMITTED') {
                                                reportStatusDisplay = (
                                                    <div className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-200">
                                                        提出済
                                                    </div>
                                                );
                                            }
                                        } else {
                                            // Check if overdue (only if no report)
                                            const scheduledEnd = app.scheduled_work_end ? new Date(app.scheduled_work_end) : null;
                                            if (scheduledEnd && scheduledEnd <= new Date()) {
                                                reportStatusDisplay = (
                                                    <div className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-200">
                                                        未報告
                                                    </div>
                                                );
                                            } else {
                                                reportStatusDisplay = (
                                                    <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                                        予定
                                                    </div>
                                                );
                                            }
                                        }

                                        return (
                                            <Link key={app.id} href={`/jobs/${job?.id}?returnTo=/applications`} className="group block bg-white rounded-2xl border border-blue-50 p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDateDisplay(app)}
                                                    </div>
                                                    {reportStatusDisplay}
                                                </div>
                                                <h4 className="font-bold text-slate-900 text-sm mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                                                    {job?.title}
                                                </h4>
                                                <div className="flex items-center justify-between pt-3 border-t border-blue-100/30">
                                                    <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="line-clamp-1">{job?.address_text || "場所未定"}</span>
                                                    </div>
                                                    <div className="text-sm font-black text-slate-900">
                                                        ¥{Math.round((job?.reward_amount || 0) * 1.1).toLocaleString()}
                                                        <span className="text-[9px] font-medium text-slate-400 ml-1">税込</span>
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
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
                                                <Calendar className="w-3 h-3" />
                                                {formatDateDisplay(app)}
                                            </div>
                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-slate-200">選考中</span>
                                        </div>
                                        <h3 className="font-bold text-slate-900 mb-3 text-lg leading-snug group-hover:text-amber-600 transition-colors">{job?.title}</h3>
                                        <div className="flex items-center gap-2.5 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400">予定報酬</span>
                                            <span className="font-black text-slate-900">¥{Math.round((job?.reward_amount || 0) * 1.1).toLocaleString()}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">(税込)</span>
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
