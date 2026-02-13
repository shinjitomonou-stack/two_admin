import AdminLayout from "@/components/layout/AdminLayout";
import { Users, Briefcase, FileCheck, AlertCircle, ArrowRight, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { TodayJobsList } from "@/components/dashboard/TodayJobsList";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();

  // 1. Prepare Dates (aligned to JST)
  // Get current JST date string (YYYY-MM-DD)
  const jstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
  const jstTodayStr = jstNow.toISOString().split('T')[0];

  const startOfToday = `${jstTodayStr}T00:00:00+09:00`;
  const endOfToday = `${jstTodayStr}T23:59:59+09:00`;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1); // Start of month

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 2. Parallel Fetch All Data
  const [
    activeJobsRes,
    pendingAppsRes,
    unverifiedWorkersCountRes,
    pendingContractsRes,
    todayJobsRes,
    recentAppsRes,
    unverifiedWorkersRes,
    jobContractsRes,
    applicationsRes,
    verifiedCountRes
  ] = await Promise.all([
    // Active Jobs (OPEN or FILLED)
    supabase.from("jobs").select("*", { count: "exact", head: true }).in("status", ["OPEN", "FILLED"]),
    // Pending Applications (APPLIED)
    supabase.from("job_applications").select("*", { count: "exact", head: true }).eq("status", "APPLIED"),
    // Unverified Workers Count
    supabase.from("workers").select("*", { count: "exact", head: true }).eq("is_verified", false),
    // Pending Basic Contracts
    supabase.from("worker_basic_contracts").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    // Today's Jobs (Broad fetch to filter in memory for scheduled_work_start priority)
    supabase.from("jobs").select(`
      id,
      title,
      status,
      start_time,
      end_time,
      address_text,
      clients(name),
      job_applications(scheduled_work_start, scheduled_work_end)
    `).order("start_time", { ascending: true }),
    // Recent Applications
    supabase.from("job_applications").select(`
      id,
      created_at,
      status,
      workers(full_name),
      jobs(title)
    `).eq("status", "APPLIED").order("created_at", { ascending: false }).limit(5),
    // Unverified Workers List
    supabase.from("workers").select("id, full_name, email, created_at").eq("is_verified", false).order("created_at", { ascending: false }).limit(5),
    // Client Job Contracts for Monthly Sales
    supabase.from("client_job_contracts").select("contract_amount, billing_cycle, created_at").gte("created_at", sixMonthsAgo.toISOString()),
    // Applications for Trends
    supabase.from("job_applications").select("created_at").gte("created_at", thirtyDaysAgo.toISOString()),
    // Verified Workers Count
    supabase.from("workers").select("*", { count: "exact", head: true }).eq("is_verified", true)
  ]);

  const activeJobsCount = activeJobsRes.count;
  const pendingAppsCount = pendingAppsRes.count;
  const unverifiedWorkersCount = unverifiedWorkersCountRes.count;
  const pendingContractsCount = pendingContractsRes.count;

  // Filter Today's Jobs in memory to prioritize scheduled_work_start
  const todayJobs = (todayJobsRes.data || []).filter(job => {
    // 1. Check if any application is scheduled for today
    const hasTodayApp = job.job_applications?.some((app: any) => {
      if (!app.scheduled_work_start) return false;
      const appDateStr = app.scheduled_work_start.split('T')[0];
      return appDateStr === jstTodayStr;
    });

    if (hasTodayApp) return true;

    // 2. If no application is scheduled for today, check if any application is scheduled at ALL for this job
    // If there ARE scheduled applications but none are today, this job shouldn't show today (it belongs to another day)
    const hasAnyScheduledApp = job.job_applications?.some((app: any) => !!app.scheduled_work_start);
    if (hasAnyScheduledApp) return false;

    // 3. Fallback: If no scheduled applications, check job.start_time
    if (!job.start_time) return false;
    const jobDateStr = job.start_time.split('T')[0];
    return jobDateStr === jstTodayStr;
  });

  const recentApps = recentAppsRes.data;
  const unverifiedWorkers = unverifiedWorkersRes.data;
  const jobContracts = jobContractsRes.data;
  const applications = applicationsRes.data;
  const verifiedCount = verifiedCountRes.count;

  // 3. Aggregate Data for Charts
  // A. Monthly Sales (Client Job Contracts + Client Contracts)
  // Note: This is a simplified estimation.
  // Helper to format month Key (e.g., "2023-11")
  const getMonthKey = (dateStr: string) => dateStr.substring(0, 7);

  const salesMap = new Map<string, number>();
  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = getMonthKey(d.toISOString());
    salesMap.set(key, 0);
  }

  jobContracts?.forEach(c => {
    const key = getMonthKey(c.created_at);
    if (salesMap.has(key)) {
      // Aggregate if it's not a one-time contract (as per user request: "都度以外")
      if (c.billing_cycle !== 'ONCE') {
        const amount = Number(c.contract_amount) || 0;
        salesMap.set(key, (salesMap.get(key) || 0) + amount);
      }
    }
  });

  const salesData = Array.from(salesMap.entries())
    .map(([month, amount]) => ({
      month: month.substring(5) + "月", // "11月"
      amount,
      sortKey: month
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ month, amount }) => ({ month, amount }));

  // B. Application Trends (Last 30 days)
  const appMap = new Map<string, number>();
  // Initialize last 30 days
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10); // YYYY-MM-DD
    appMap.set(key, 0);
  }

  applications?.forEach(app => {
    const key = app.created_at.substring(0, 10);
    if (appMap.has(key)) {
      appMap.set(key, (appMap.get(key) || 0) + 1);
    }
  });

  const applicationData = Array.from(appMap.entries())
    .map(([date, count]) => ({
      date: date.substring(5).replace("-", "/"), // MM/DD
      count,
      sortKey: date
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ date, count }) => ({ date, count }));

  // C. Worker Status
  const workerData = [
    { name: "本人確認済み", value: verifiedCount || 0 },
    { name: "未確認", value: unverifiedWorkersCount || 0 },
  ].filter(d => d.value > 0);

  // Fallback for empty data to avoid ugly chart
  if (workerData.length === 0) {
    workerData.push({ name: "データなし", value: 1 });
  }

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

        {/* Today's Jobs Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">本日の案件状況</h3>
            <Link href="/jobs" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              案件管理へ <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <TodayJobsList jobs={todayJobs || []} />
        </div>

        {/* Charts Section */}
        <DashboardCharts
          salesData={salesData}
          applicationData={applicationData}
          workerData={workerData}
        />

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
