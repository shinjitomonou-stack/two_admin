"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, Clock, Save, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import BackButton from "@/components/BackButton";

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
        <div className="min-h-screen bg-slate-50 pb-20 overflow-hidden relative">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-3xl opacity-60" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-3xl opacity-60" />

            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/70 backdrop-blur-lg border-b border-slate-200/60 px-4 py-3">
                <div className="flex items-center gap-3 max-w-md mx-auto">
                    <BackButton fallbackHref="/" />
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">作業予定の設定</h1>
                </div>
            </header>

            <main className="p-6 relative z-10">
                <div className="max-w-md mx-auto space-y-6">
                    {/* Welcome/Instruction Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-wider mb-4">
                                <Sparkles className="w-3 h-3 text-yellow-400" />
                                勤務スケジュールの入力
                            </div>
                            <h2 className="text-xl font-bold mb-2">作業予定が決まりましたか？</h2>
                            <p className="text-white/70 text-xs leading-relaxed">
                                採用された案件の実施予定を入力してください。<br />
                                入力された日時に基づいてお仕事が管理されます。
                            </p>
                        </div>
                    </div>

                    {/* Form Container */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50 p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Date Input Style */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    作業予定日
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        required
                                        className="w-full h-14 px-5 rounded-2xl border-none bg-slate-100 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                                    />
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                        <CheckCircle2 className={`w-5 h-5 transition-colors ${scheduleDate ? 'text-green-500' : 'text-slate-200'}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Time range inputs with modern look */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    作業時間
                                </label>
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                                    <input
                                        type="time"
                                        value={scheduleStartTime}
                                        onChange={(e) => setScheduleStartTime(e.target.value)}
                                        required
                                        className="h-14 px-4 rounded-2xl border-none bg-slate-100 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all text-center"
                                    />
                                    <span className="font-bold text-slate-300">〜</span>
                                    <input
                                        type="time"
                                        value={scheduleEndTime}
                                        onChange={(e) => setScheduleEndTime(e.target.value)}
                                        required
                                        className="h-14 px-4 rounded-2xl border-none bg-slate-100 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all text-center"
                                    />
                                </div>
                            </div>

                            {/* Submit Button with Gradient and Shadow */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <Save className="w-6 h-6 relative z-10" />
                                    <span className="relative z-10">
                                        {isLoading ? "保存プログラム実行中..." : "この内容で予定を確定"}
                                    </span>
                                </button>
                                <p className="text-center text-[10px] text-slate-400 mt-4 font-medium">
                                    確定後の変更は管理者までお問い合わせください
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
