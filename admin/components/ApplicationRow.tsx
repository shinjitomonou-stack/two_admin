"use client";

import { CheckCircle, XCircle, Loader2, Calendar, Clock, Save, FileText, UserMinus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { formatDateTime, formatDate, formatTime } from "@/lib/utils";
import { updateApplicationStatus, updateApplicationSchedule } from "@/app/actions/application";
import { LinkIndividualContractButton } from "./LinkIndividualContractButton";

type Application = {
    id: string;
    worker_id: string;
    status: string;
    created_at: string;
    scheduled_work_start?: string | null;
    scheduled_work_end?: string | null;
    actual_work_start?: string | null;
    actual_work_end?: string | null;
    workers: {
        full_name: string;
        tags: string[];
    };
    reports?: {
        id: string;
        status: string;
    }[];
    individual_contract_id?: string | null;
    individual_contracts?: {
        id: string;
        contract_templates: {
            title: string;
        };
    } | null;
};

const STATUS_STYLES = {
    APPLIED: "bg-blue-100 text-blue-700",
    ASSIGNED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700",
    CONFIRMED: "bg-purple-100 text-purple-700",
};

const STATUS_LABELS = {
    APPLIED: "応募中",
    ASSIGNED: "採用",
    REJECTED: "不採用",
    CANCELLED: "辞退",
    CONFIRMED: "契約済",
};

import { CheckSquare, Square } from "lucide-react";

export function ApplicationRow({
    app,
    isSelected,
    onSelect,
    isSelectable
}: {
    app: Application;
    isSelected?: boolean;
    onSelect?: () => void;
    isSelectable?: boolean;
}) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isEditingSchedule, setIsEditingSchedule] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleStartTime, setScheduleStartTime] = useState("");
    const [scheduleEndTime, setScheduleEndTime] = useState("");
    const pathname = usePathname();

    const handleStatusUpdate = async (newStatus: 'ASSIGNED' | 'REJECTED' | 'CANCELLED') => {
        const confirmMessage = newStatus === 'ASSIGNED' ? "このワーカーを採用しますか？" :
            newStatus === 'REJECTED' ? "このワーカーを不採用にしますか？" :
                "このワーカーの採用を解除（キャンセル）しますか？";

        if (!confirm(confirmMessage)) return;

        setIsUpdating(true);
        await updateApplicationStatus(app.id, newStatus);
        setIsUpdating(false);
    };

    const handleScheduleSave = async () => {
        if (!scheduleDate || !scheduleStartTime || !scheduleEndTime) {
            alert("日付と時間を入力してください");
            return;
        }

        setIsUpdating(true);
        const scheduledStart = new Date(`${scheduleDate}T${scheduleStartTime}`).toISOString();
        const scheduledEnd = new Date(`${scheduleDate}T${scheduleEndTime}`).toISOString();

        await updateApplicationSchedule(app.id, scheduledStart, scheduledEnd);
        setIsUpdating(false);
        setIsEditingSchedule(false);
    };

    const startEditingSchedule = () => {
        if (app.scheduled_work_start && app.scheduled_work_end) {
            const start = new Date(app.scheduled_work_start);
            const end = new Date(app.scheduled_work_end);
            setScheduleDate(start.toISOString().split('T')[0]);
            setScheduleStartTime(start.toTimeString().slice(0, 5));
            setScheduleEndTime(end.toTimeString().slice(0, 5));
        } else {
            // Default to 09:00 - 10:00 with :00 minutes
            setScheduleStartTime("09:00");
            setScheduleEndTime("10:00");
        }
        setIsEditingSchedule(true);
    };

    return (
        <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="px-6 py-4 w-12">
                {isSelectable && (
                    <button
                        onClick={onSelect}
                        className={isSelected ? "text-blue-600" : "text-slate-300 hover:text-slate-400"}
                    >
                        {isSelected ? (
                            <CheckSquare className="w-5 h-5" />
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                    </button>
                )}
            </td>
            <td className="px-6 py-4">
                <Link href={`/workers/${app.worker_id}`} className="group">
                    <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                        {app.workers?.full_name}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {app.workers?.tags && app.workers.tags.length > 0 ? (
                            app.workers.tags.map((tag, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] border border-blue-100 font-medium">
                                    {tag}
                                </span>
                            ))
                        ) : (
                            <div className="text-[10px] text-muted-foreground opacity-50">-</div>
                        )}
                    </div>
                </Link>
            </td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[app.status as keyof typeof STATUS_STYLES]}`}>
                    {STATUS_LABELS[app.status as keyof typeof STATUS_LABELS] || app.status}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">応募日時</div>
                    <div className="text-sm text-slate-500">{formatDateTime(app.created_at)}</div>

                    {(app.status === 'ASSIGNED' || app.status === 'CONFIRMED') && (
                        <>
                            <div className="text-xs text-muted-foreground mt-3">作業予定</div>
                            {isEditingSchedule ? (
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        value={scheduleDate}
                                        onChange={(e) => setScheduleDate(e.target.value)}
                                        className="w-full px-2 py-1 text-xs border rounded"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="time"
                                            value={scheduleStartTime}
                                            onChange={(e) => setScheduleStartTime(e.target.value)}
                                            className="w-full px-2 py-1 text-xs border rounded"
                                        />
                                        <span className="text-xs self-center">-</span>
                                        <input
                                            type="time"
                                            value={scheduleEndTime}
                                            onChange={(e) => setScheduleEndTime(e.target.value)}
                                            className="w-full px-2 py-1 text-xs border rounded"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleScheduleSave}
                                            disabled={isUpdating}
                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            <Save className="w-3 h-3" />
                                            保存
                                        </button>
                                        <button
                                            onClick={() => setIsEditingSchedule(false)}
                                            className="px-2 py-1 text-xs bg-slate-200 rounded hover:bg-slate-300"
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm">
                                    {app.scheduled_work_start && app.scheduled_work_end ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                <span>{formatDate(app.scheduled_work_start)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <span>{formatTime(app.scheduled_work_start)} - {formatTime(app.scheduled_work_end)}</span>
                                            </div>
                                            <button
                                                onClick={startEditingSchedule}
                                                className="text-xs text-blue-600 hover:underline"
                                            >
                                                編集
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={startEditingSchedule}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            + 予定日を設定
                                        </button>
                                    )}
                                </div>
                            )}

                            {app.actual_work_start && app.actual_work_end && (
                                <>
                                    <div className="text-xs text-muted-foreground mt-3">作業実施</div>
                                    <div className="text-sm space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-green-600" />
                                            <span className="text-green-700">{formatDate(app.actual_work_start)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-green-600" />
                                            <span className="text-green-700">{formatTime(app.actual_work_start)} - {formatTime(app.actual_work_end)}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {app.reports && app.reports.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <Link
                                        href={`/reports/${app.reports[0].id}?returnTo=${encodeURIComponent(pathname)}`}
                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        <FileText className="w-4 h-4" />
                                        作業報告を確認
                                    </Link>
                                </div>
                            )}

                            {(app.status === 'ASSIGNED' || app.status === 'CONFIRMED') && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="text-xs text-muted-foreground mb-2">個別契約（署名済）</div>
                                    <LinkIndividualContractButton
                                        applicationId={app.id}
                                        workerId={app.worker_id}
                                        currentContractId={app.individual_contract_id}
                                        currentContractTitle={app.individual_contracts?.contract_templates?.title}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                {app.status === 'APPLIED' && (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => handleStatusUpdate('ASSIGNED')}
                            disabled={isUpdating}
                            className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                            title="採用"
                        >
                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => handleStatusUpdate('REJECTED')}
                            disabled={isUpdating}
                            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="不採用"
                        >
                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                        </button>
                    </div>
                )}
                {(app.status === 'ASSIGNED' || app.status === 'CONFIRMED') && (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => handleStatusUpdate('CANCELLED')}
                            disabled={isUpdating}
                            className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                            title="採用解除 (キャンセル)"
                        >
                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserMinus className="w-5 h-5" />}
                        </button>
                    </div>
                )}
                {app.status === 'CANCELLED' && (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => handleStatusUpdate('ASSIGNED')}
                            disabled={isUpdating}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                            title="再採用"
                        >
                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
                        </button>
                    </div>
                )}
            </td>
        </tr >
    );
}
