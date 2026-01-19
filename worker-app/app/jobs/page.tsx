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
                    <h1 className="font-bold text-lg text-slate-900">案件一覧</h1>
                </div>
            </header>

            {/* Job List - Hidden for Phase 1 */}
            <main className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="bg-slate-100 p-4 rounded-full">
                    <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="font-bold text-lg text-slate-700">現在募集中の案件はありません</h2>
                <p className="text-sm text-slate-500">
                    新しい案件が追加されるまでお待ちください。<br />
                    通知設定をオンにしておくと、新着案件の通知を受け取れます。
                </p>
                <Link href="/" className="text-blue-600 text-sm font-medium hover:underline mt-4">
                    ホームに戻る
                </Link>
            </main>

            {/* Hidden for Phase 1
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
            */}
        </div>
    );
}
