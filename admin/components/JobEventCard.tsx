"use client";

import Link from "next/link";

interface CalendarJob {
    id: string;
    job_id: string;
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
}

interface JobEventCardProps {
    job: CalendarJob;
}

const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700 border-blue-200",
    ASSIGNED: "bg-yellow-100 text-yellow-700 border-yellow-200",
    IN_PROGRESS: "bg-orange-100 text-orange-700 border-orange-200",
    COMPLETED: "bg-green-100 text-green-700 border-green-200",
    CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
};

export function JobEventCard({ job }: JobEventCardProps) {
    const startTime = new Date(job.scheduled_work_start);
    const endTime = job.scheduled_work_end ? new Date(job.scheduled_work_end) : null;

    const formatTime = (date: Date) => {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <Link
            href={`/jobs/${job.job_id}?return=calendar`}
            className={`block text-xs p-2 rounded border ${statusColors[job.status] || statusColors.OPEN
                } hover:opacity-80 transition-opacity`}
        >
            <div className="font-medium truncate mb-0.5">
                {job.title}
            </div>
            {job.worker && (
                <div className="text-[10px] opacity-75 truncate">
                    👤 {job.worker.full_name}
                </div>
            )}
            <div className="text-[10px] opacity-75">
                🕐 {formatTime(startTime)}
                {endTime && ` - ${formatTime(endTime)}`}
            </div>
        </Link>
    );
}
