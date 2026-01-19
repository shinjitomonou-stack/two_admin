import AdminLayout from "@/components/layout/AdminLayout";
import { createClient } from "@/lib/supabase/server";
import { CalendarWithStats } from "@/components/CalendarWithStats";

export default async function CalendarPage() {
    const supabase = await createClient();

    // Fetch all jobs with their applications
    const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
            id,
            title,
            status,
            billing_amount,
            reward_amount,
            start_time,
            end_time,
            job_applications(
                id,
                scheduled_work_start,
                scheduled_work_end,
                status,
                workers(full_name)
            )
        `)
        .order("start_time", { ascending: true });

    if (error) {
        console.error("Error fetching jobs:", error);
    }

    // Transform data to match Calendar component interface
    const calendarJobs: any[] = [];

    (jobs || []).forEach((job) => {
        const applications = (job.job_applications || []).filter(app => app.scheduled_work_start);

        if (applications.length > 0) {
            // If there are applications with schedules, add each as an event
            applications.forEach(app => {
                const worker = Array.isArray(app.workers) ? app.workers[0] : app.workers;
                calendarJobs.push({
                    id: `${job.id}-${app.id}`,
                    title: job.title,
                    status: job.status,
                    scheduled_work_start: app.scheduled_work_start,
                    scheduled_work_end: app.scheduled_work_end,
                    worker: worker,
                    client: { name: "" },
                    billing_amount: Math.round(Number(job.billing_amount) || 0),
                    payment_amount: Math.round(Number(job.reward_amount) || 0),
                });
            });
        } else {
            // No scheduled applications, show the job itself using fallback dates
            calendarJobs.push({
                id: job.id,
                title: job.title,
                status: job.status,
                scheduled_work_start: job.start_time,
                scheduled_work_end: job.end_time,
                worker: null,
                client: { name: "" },
                billing_amount: Math.round(Number(job.billing_amount) || 0),
                payment_amount: Math.round(Number(job.reward_amount) || 0),
            });
        }
    });

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">案件カレンダー</h2>
                    <p className="text-muted-foreground">
                        作業予定日ごとに案件を確認できます。
                    </p>
                </div>

                {/* Calendar with Dynamic Stats */}
                <CalendarWithStats jobs={calendarJobs} />

                {/* Legend */}
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">ステータス凡例</h3>
                    <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                            <span>募集中</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
                            <span>アサイン済み</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></div>
                            <span>作業中</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                            <span>完了</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200"></div>
                            <span>キャンセル</span>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
