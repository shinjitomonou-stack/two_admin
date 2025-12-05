import { JobCard, Job } from "@/components/JobCard";
import { Search, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate, formatTimeRange } from "@/lib/utils";

export default async function JobsPage() {
    const supabase = await createClient();
    const { data: jobs, error } = await supabase
        .from("jobs")
        .select("*, job_applications(status)")
        .eq("status", "OPEN")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching jobs:", error);
    }

    // Map Supabase data to Job type
    const mappedJobs: Job[] = jobs?.map((job) => {
        // Calculate confirmed count (ASSIGNED or CONFIRMED)
        const confirmedCount = job.job_applications?.filter(
            (app: any) => app.status === 'ASSIGNED' || app.status === 'CONFIRMED'
        ).length || 0;

        return {
            id: job.id,
            title: job.title,
            location: job.address_text || "場所未定",
            reward: job.reward_amount,
            date: formatDate(job.start_time),
            time: formatTimeRange(job.start_time, job.end_time),
            image: "https://images.unsplash.com/photo-1581578731117-104f2a863a30?w=800&q=80", // Placeholder
            tags: ["募集中"], // Placeholder
            is_flexible: job.is_flexible,
            work_period_start: job.work_period_start,
            work_period_end: job.work_period_end,
            max_workers: job.max_workers,
            confirmed_count: confirmedCount,
        };
    }) || [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="エリア・キーワードで検索"
                            className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-full hover:bg-slate-200 transition-colors">
                        <SlidersHorizontal className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>
            </header>

            {/* Job List */}
            <main className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg">おすすめの案件</h2>
                    <span className="text-xs text-muted-foreground">全 {mappedJobs.length} 件</span>
                </div>

                {mappedJobs.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {mappedJobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>現在募集中の案件はありません。</p>
                    </div>
                )}
            </main>
        </div>
    );
}
