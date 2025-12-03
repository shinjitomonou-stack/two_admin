import AdminLayout from "@/components/layout/AdminLayout";
import { createClient } from "@/lib/supabase/server";
import { Calendar } from "@/components/Calendar";

export default async function CalendarPage() {
    const supabase = await createClient();

    // Fetch all jobs with their schedules, workers, and clients
    const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
            id,
            title,
            status,
            scheduled_work_start,
            scheduled_work_end,
            worker:workers(full_name),
            client:clients(name)
        `)
        .not("scheduled_work_start", "is", null)
        .order("scheduled_work_start", { ascending: true });

    if (error) {
        console.error("Error fetching jobs:", error);
    }

    // Transform data to match Calendar component interface
    const calendarJobs = (jobs || []).map((job) => ({
        id: job.id,
        title: job.title,
        status: job.status,
        scheduled_work_start: job.scheduled_work_start,
        scheduled_work_end: job.scheduled_work_end,
        worker: Array.isArray(job.worker) ? job.worker[0] : job.worker,
        client: Array.isArray(job.client) ? job.client[0] : job.client,
    }));

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

                {/* Calendar */}
                <Calendar jobs={calendarJobs} />

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="text-sm text-slate-500">今月の案件</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">
                            {calendarJobs.filter((job) => {
                                const date = new Date(job.scheduled_work_start);
                                const now = new Date();
                                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                            }).length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="text-sm text-slate-500">募集中</div>
                        <div className="text-2xl font-bold text-blue-600 mt-1">
                            {calendarJobs.filter((job) => job.status === "OPEN").length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="text-sm text-slate-500">作業中</div>
                        <div className="text-2xl font-bold text-orange-600 mt-1">
                            {calendarJobs.filter((job) => job.status === "IN_PROGRESS").length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="text-sm text-slate-500">完了</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                            {calendarJobs.filter((job) => job.status === "COMPLETED").length}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
