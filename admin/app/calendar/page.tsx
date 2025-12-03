import AdminLayout from "@/components/layout/AdminLayout";
import { createClient } from "@/lib/supabase/server";
import { Calendar } from "@/components/Calendar";

export default async function CalendarPage() {
    const supabase = await createClient();

    // Fetch all job applications with their schedules
    const { data: applications, error } = await supabase
        .from("job_applications")
        .select(`
            id,
            scheduled_work_start,
            scheduled_work_end,
            status,
            job:jobs(id, title, status, billing_amount, payment_amount),
            worker:workers(full_name)
        `)
        .not("scheduled_work_start", "is", null)
        .order("scheduled_work_start", { ascending: true });

    if (error) {
        console.error("Error fetching applications:", error);
    }

    console.log("Fetched applications:", applications?.length || 0);
    console.log("First application:", applications?.[0]);

    // Transform data to match Calendar component interface
    const calendarJobs = (applications || []).map((app) => {
        const job = Array.isArray(app.job) ? app.job[0] : app.job;
        const worker = Array.isArray(app.worker) ? app.worker[0] : app.worker;

        return {
            id: job?.id || app.id,
            title: job?.title || "案件名不明",
            status: job?.status || "OPEN",
            scheduled_work_start: app.scheduled_work_start,
            scheduled_work_end: app.scheduled_work_end,
            worker: worker,
            client: { name: "" },
            billing_amount: Number(job?.billing_amount) || 0,
            payment_amount: Number(job?.payment_amount) || 0,
        };
    });

    console.log("Transformed jobs:", calendarJobs.length);

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">案件カレンダー</h2>
                    <p className="text-muted-foreground">
                        作業予定日ごとに案件を確認できます。
                    </p>
                    {/* Debug Info */}
                    <div className="mt-2 text-xs text-slate-500">
                        デバッグ: 取得件数={applications?.length || 0}, エラー={error ? 'あり' : 'なし'}, 変換後={calendarJobs.length}
                    </div>
                </div>

                {/* Stats - Above Calendar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="text-sm text-slate-500">案件数</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">
                            {calendarJobs.length}件
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="text-sm text-slate-500">請求金額</div>
                        <div className="text-2xl font-bold text-blue-600 mt-1">
                            ¥{calendarJobs.reduce((sum, job) => sum + (job.billing_amount || 0), 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="text-sm text-slate-500">報酬金額</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                            ¥{calendarJobs.reduce((sum, job) => sum + (job.payment_amount || 0), 0).toLocaleString()}
                        </div>
                    </div>
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
            </div>
        </AdminLayout>
    );
}
