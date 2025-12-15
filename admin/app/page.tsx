import AdminLayout from "@/components/layout/AdminLayout";
import { Users, Briefcase, FileCheck, AlertCircle, ArrowRight, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function Home() {
  const supabase = await createClient();

  // 1. Fetch Stats
  // Active Jobs (OPEN or FILLED)
  const { count: activeJobsCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .in("status", ["OPEN", "FILLED"]);

  // Pending Applications (APPLIED)
  const { count: pendingAppsCount } = await supabase
    .from("job_applications")
    .select("*", { count: "exact", head: true })
    .eq("status", "APPLIED");

  // Unverified Workers
  const { count: unverifiedWorkersCount } = await supabase
    .from("workers")
    .select("*", { count: "exact", head: true })
    .eq("is_verified", false);

  // Pending Basic Contracts
  // Note: This might be complex depending on how we define "pending" globally, 
  // but for now let's count all pending basic contracts.
  const { count: pendingContractsCount } = await supabase
    .from("worker_basic_contracts")
    .select("*", { count: "exact", head: true })
    .eq("status", "PENDING");

  // 2. Fetch Recent Data
  // Recent Applications
  const { data: recentApps } = await supabase
    .from("job_applications")
    .select(`
      id,
      created_at,
      status,
      workers(full_name),
      jobs(title)
    `)
    .eq("status", "APPLIED")
    .order("created_at", { ascending: false })
    .limit(5);

  // Unverified Workers
  const { data: unverifiedWorkers } = await supabase
    .from("workers")
    .select("id, full_name, email, created_at")
    .eq("is_verified", false)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
          <p className="text-muted-foreground mt-2">
            現在のシステム状況と対応が必要な項目を確認します。
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "稼働中・募集中案件",
              value: activeJobsCount || 0,
              icon: Briefcase,
              color: "text-blue-600",
              href: "/jobs"
            },
            {
              label: "未対応の応募",
              value: pendingAppsCount || 0,
              icon: Users,
              color: "text-green-600",
              href: "/jobs" // Ideally filter by status
            },
            {
              label: "本人確認待ち",
              value: unverifiedWorkersCount || 0,
              icon: ShieldAlert,
              color: "text-orange-600",
              href: "/workers"
            },
            {
              label: "契約確認待ち",
              value: pendingContractsCount || 0,
              icon: FileCheck,
              color: "text-red-600",
              href: "/contracts" // Assuming we have a contracts page or similar
            },
          ].map((stat, i) => (
            <Link key={i} href={stat.href} className="block group">
              <div className="p-6 bg-card rounded-xl border border-border shadow-sm group-hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Applications */}
          <div className="p-6 bg-card rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">未対応の応募</h3>
              <Link href="/jobs" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                すべて見る <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentApps?.map((app) => {
                const workerName = Array.isArray(app.workers) ? app.workers[0]?.full_name : (app.workers as any)?.full_name;
                const jobTitle = Array.isArray(app.jobs) ? app.jobs[0]?.title : (app.jobs as any)?.title;

                return (
                  <div key={app.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{workerName}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{jobTitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                        応募済み
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(app.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              {(!recentApps || recentApps.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">未対応の応募はありません</p>
              )}
            </div>
          </div>

          {/* Unverified Workers */}
          <div className="p-6 bg-card rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">本人確認待ちワーカー</h3>
              <Link href="/workers" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                すべて見る <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {unverifiedWorkers?.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{worker.full_name}</p>
                      <p className="text-xs text-muted-foreground">{worker.email}</p>
                    </div>
                  </div>
                  <Link
                    href={`/workers/${worker.id}`}
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 whitespace-nowrap"
                  >
                    確認する
                  </Link>
                </div>
              ))}
              {(!unverifiedWorkers || unverifiedWorkers.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">確認待ちのワーカーはありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
