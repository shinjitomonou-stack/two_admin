"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Save } from "lucide-react";
import Link from "next/link";

export default function SchedulePage() {
    const router = useRouter();
    const params = useParams();
    const applicationId = params.id as string;

    const [isLoading, setIsLoading] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleStartTime, setScheduleStartTime] = useState("09:00");
    const [scheduleEndTime, setScheduleEndTime] = useState("10:00");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!scheduleDate || !scheduleStartTime || !scheduleEndTime) {
            alert("すべての項目を入力してください");
            return;
        }

        setIsLoading(true);

        try {
            const scheduledStart = new Date(`${scheduleDate}T${scheduleStartTime}`).toISOString();
            const scheduledEnd = new Date(`${scheduleDate}T${scheduleEndTime}`).toISOString();

            const response = await fetch("/api/applications/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    applicationId,
                    scheduledStart,
                    scheduledEnd,
                }),
            });

            if (!response.ok) throw new Error("Failed to save schedule");

            alert("作業予定日を設定しました");
            router.push("/");
        } catch (error) {
            console.error("Error saving schedule:", error);
            alert("エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <h1 className="text-lg font-bold">作業予定日の設定</h1>
                </div>
            </header>

            {/* Form */}
            <main className="p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm p-6 max-w-md mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                作業予定日
                            </label>
                            <input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                required
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-500" />
                                作業時間
                            </label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="time"
                                    value={scheduleStartTime}
                                    onChange={(e) => setScheduleStartTime(e.target.value)}
                                    required
                                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <span className="text-slate-500">-</span>
                                <input
                                    type="time"
                                    value={scheduleEndTime}
                                    onChange={(e) => setScheduleEndTime(e.target.value)}
                                    required
                                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {isLoading ? "保存中..." : "予定日を保存"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
