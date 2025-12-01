import { MapPin, Clock, Banknote, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type Job = {
    id: string;
    title: string;
    location?: string;
    address_text?: string | null;
    reward?: number;
    reward_amount?: number;
    date?: string;
    start_time?: string;
    end_time?: string;
    time?: string;
    image?: string;
    tags?: string[];
    is_flexible?: boolean;
    work_period_start?: string;
    work_period_end?: string;
};

export function JobCard({ job }: { job: Job }) {
    // Normalize data
    const reward = job.reward_amount ?? job.reward ?? 0;
    const location = job.address_text ?? job.location ?? "場所未定";

    let dateStr = job.date;
    let timeStr = job.time;

    if (job.is_flexible && job.work_period_start && job.work_period_end) {
        const startDate = new Date(job.work_period_start);
        const endDate = new Date(job.work_period_end);
        // Simple format for range: 12/1 - 12/5
        const format = (d: Date) => d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
        dateStr = `${format(startDate)} 〜 ${format(endDate)}`;
        timeStr = "期間内自由";
    } else if (job.start_time && job.end_time) {
        const startDate = new Date(job.start_time);
        const endDate = new Date(job.end_time);
        dateStr = startDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
        timeStr = `${startDate.getHours()}:${startDate.getMinutes().toString().padStart(2, '0')} - ${endDate.getHours()}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    }

    const image = job.image || "https://images.unsplash.com/photo-1581578731117-104f2a863a30?w=800&q=80";
    const tags = job.tags || ["募集中"];

    return (
        <Link href={`/jobs/${job.id}`}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-border shadow-sm active:scale-[0.98] transition-transform duration-200">
                <div className="relative h-32 bg-slate-200">
                    <img
                        src={image}
                        alt={job.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-900 dark:text-white shadow-sm">
                        ¥{reward.toLocaleString()}
                    </div>
                </div>
                <div className="p-4 space-y-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                            {tags.map((tag) => (
                                <span key={tag} className="bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h3 className="font-bold text-lg leading-tight line-clamp-2">
                            {job.title}
                        </h3>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{dateStr}</span>
                            <span className="text-slate-300">|</span>
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>{timeStr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="line-clamp-1">{location}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
