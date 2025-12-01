import AdminLayout from "@/components/layout/AdminLayout";
import { Plus, Search, Filter, MoreHorizontal, MapPin, Calendar, Eye, Edit } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES = {
    OPEN: "bg-green-100 text-green-700",
    FILLED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-slate-100 text-slate-700",
    CANCELLED: "bg-red-100 text-red-700",
    DRAFT: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS = {
    OPEN: "募集中",
    FILLED: "満員",
    COMPLETED: "完了",
    CANCELLED: "中止",
    DRAFT: "下書き",
};

export default async function JobsPage() {
    const supabase = await createClient();
    const { data: jobs, error } = await supabase
        .from("jobs")
        .select(`
            *,
            clients(name),
            job_applications(id, status, workers(full_name))
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching jobs:", error);
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">案件管理</h2>
                        <p className="text-muted-foreground">
                            登録されている案件の確認・編集・新規作成を行います。
                        </p>
                    </div>
                    <Link
                        href="/jobs/create"
                        className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規案件作成
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="案件名、クライアント名で検索..."
                            className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-input rounded-md hover:bg-slate-50 text-sm font-medium">
                        <Filter className="w-4 h-4" />
                        フィルター
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">案件名 / クライアント</th>
                                    <th className="px-6 py-3 font-medium">場所 / 日時</th>
                                    <th className="px-6 py-3 font-medium">報酬</th>
                                    <th className="px-6 py-3 font-medium">ステータス</th>
                                    <th className="px-6 py-3 font-medium">募集人数</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {jobs?.map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link href={`/jobs/${job.id}`} className="block group">
                                                <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{job.title}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {/* @ts-ignore: Joined data */}
                                                    {job.clients?.name || "クライアント未設定"}
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-[150px]">{job.address_text || "場所未定"}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(job.start_time)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            ¥{job.reward_amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[job.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.DRAFT}`}>
                                                {STATUS_LABELS[job.status as keyof typeof STATUS_LABELS] || job.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {(() => {
                                                    // @ts-ignore
                                                    const applications = job.job_applications || [];
                                                    const assignedApps = applications.filter((app: any) =>
                                                        app.status === 'ASSIGNED' || app.status === 'CONFIRMED'
                                                    );
                                                    const assignedCount = assignedApps.length;

                                                    return (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-slate-500">
                                                                    {assignedCount}/{job.max_workers}名
                                                                </span>
                                                                {assignedCount > 0 && (
                                                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                                        アサイン済
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {assignedCount > 0 && (
                                                                <div className="text-xs text-slate-600">
                                                                    {assignedApps.slice(0, 2).map((app: any, idx: number) => (
                                                                        <div key={idx}>{app.workers?.full_name}</div>
                                                                    ))}
                                                                    {assignedCount > 2 && (
                                                                        <div className="text-slate-400">他{assignedCount - 2}名</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/jobs/${job.id}`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-blue-600"
                                                    title="詳細"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/jobs/${job.id}/edit`}
                                                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-green-600"
                                                    title="編集"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!jobs || jobs.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            案件がまだありません。
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
