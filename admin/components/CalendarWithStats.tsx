"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { JobEventCard } from "@/components/JobEventCard";

interface CalendarJob {
    id: string;
    title: string;
    status: string;
    scheduled_work_start: string;
    scheduled_work_end: string;
    worker: {
        full_name: string;
    } | null;
    client: {
        name: string;
    };
    billing_amount: number;
    payment_amount: number;
}

interface CalendarWithStatsProps {
    jobs: CalendarJob[];
}

export function CalendarWithStats({ jobs }: CalendarWithStatsProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Filter jobs for the current month
    const currentMonthJobs = useMemo(() => {
        return jobs.filter(job => {
            if (!job.scheduled_work_start) return false;
            const jobDate = new Date(job.scheduled_work_start);
            return jobDate.getFullYear() === year && jobDate.getMonth() === month;
        });
    }, [jobs, year, month]);

    // Calculate statistics for the current month
    const stats = useMemo(() => {
        return {
            count: currentMonthJobs.length,
            totalBilling: currentMonthJobs.reduce((sum, job) => sum + (job.billing_amount || 0), 0),
            totalReward: currentMonthJobs.reduce((sum, job) => sum + (job.payment_amount || 0), 0),
        };
    }, [currentMonthJobs]);

    // Generate calendar days
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    // Group jobs by date
    const jobsByDate: Record<string, CalendarJob[]> = {};
    currentMonthJobs.forEach((job) => {
        if (job.scheduled_work_start) {
            const date = new Date(job.scheduled_work_start);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (!jobsByDate[dateKey]) {
                jobsByDate[dateKey] = [];
            }
            jobsByDate[dateKey].push(job);
        }
    });

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

    return (
        <div className="space-y-6">
            {/* Stats - Dynamic based on current month */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="text-sm text-slate-500">案件数 ({month + 1}月)</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        {stats.count}件
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="text-sm text-slate-500">請求金額 ({month + 1}月)</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">
                        ¥{Math.round(stats.totalBilling).toLocaleString()}
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="text-sm text-slate-500">報酬金額 ({month + 1}月)</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">
                        ¥{Math.round(stats.totalReward).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Calendar Component */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">
                        {year}年 {month + 1}月
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToToday}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            今日
                        </button>
                        <button
                            onClick={goToPreviousMonth}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={goToNextMonth}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-4">
                    {/* Week days header */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {weekDays.map((day, index) => (
                            <div
                                key={day}
                                className={`text-center text-sm font-medium py-2 ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-slate-600'
                                    }`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-2">
                        {days.map((day, index) => {
                            if (day === null) {
                                return <div key={`empty-${index}`} className="min-h-[120px]" />;
                            }

                            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayJobs = jobsByDate[dateKey] || [];
                            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                            const dayOfWeek = (index % 7);
                            const isSunday = dayOfWeek === 0;
                            const isSaturday = dayOfWeek === 6;

                            return (
                                <div
                                    key={day}
                                    className={`min-h-[120px] border border-slate-200 rounded-lg p-2 relative group flex flex-col ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                                        }`}
                                >
                                    <div
                                        className={`text-sm font-medium mb-1 ${isToday
                                            ? 'text-blue-600'
                                            : isSunday
                                                ? 'text-red-600'
                                                : isSaturday
                                                    ? 'text-blue-600'
                                                    : 'text-slate-700'
                                            }`}
                                    >
                                        {day}
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        {dayJobs.slice(0, 3).map((job) => (
                                            <JobEventCard key={job.id} job={job} />
                                        ))}
                                        {dayJobs.length > 3 && (
                                            <div className="text-[10px] text-slate-500 text-center py-1 font-medium bg-slate-50 rounded border border-dashed border-slate-200">
                                                他 {dayJobs.length - 3} 件
                                            </div>
                                        )}
                                    </div>

                                    {/* Popover for all jobs on hover */}
                                    {dayJobs.length > 0 && (
                                        <div className="invisible group-hover:visible absolute top-0 left-0 w-[calc(100%+2px)] -ml-[1px] -mt-[1px] bg-white border border-slate-300 shadow-xl rounded-lg z-50 p-2 min-h-full">
                                            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                                                <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{day}日</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{dayJobs.length}件の案件</span>
                                            </div>
                                            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                                {dayJobs.map((job) => (
                                                    <JobEventCard key={job.id} job={job} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
