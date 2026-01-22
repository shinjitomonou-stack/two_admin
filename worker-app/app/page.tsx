import { JobCard } from "@/components/JobCard";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AlertTriangle, Calendar, Briefcase, TrendingUp, Search, FileText, Settings, Clock, CheckCircle, Bell, User, JapaneseYen, ArrowRight, Shield, Zap, Sparkles } from "lucide-react";
import { AuthSuccessMessage } from "@/components/AuthSuccessMessage";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();

  // Dashboard statistics setup
  let workDaysThisMonth = 0;
  let earningsThisMonth = 0;
  let appliedCount = 0;
  let confirmedCount = 0;
  let upcomingSchedule: any[] = [];
  let recentActivity: any[] = [];
  let announcementsWithReadStatus: any[] = [];
  let profileCompletion = 0;
  let incompleteItems: string[] = [];
  let showContractAlert = false;
  let showBankAccountAlert = false;
  let showLineAlert = false;
  let showPaymentNoticeAlert = false;
  let workerName = "";
  let pendingIndividualContracts: any[] = [];
  let applicationsNeedingSchedule: any[] = [];
  let applicationsOverdue: any[] = [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Parallel fetch: Base data
  const [authData, jobsData] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("jobs").select("*, clients(name, address)").eq("status", "OPEN").order("created_at", { ascending: false })
  ]);

  const user = authData.data?.user;
  const workerId = user?.id;
  const { data: jobs, error: jobsError } = jobsData;

  if (jobsError) {
    console.error("Error fetching jobs:", jobsError);
  }

  if (workerId) {
    // 1. Fetch all worker-related data in parallel
    const [
      workerRes,
      templateRes,
      completedWorkRes,
      earningsRes,
      applicationsRes,
      scheduleRes,
      recentActivityRes,
      announcementsRes,
      pendingNoticesRes,
      pendingContractsRes,
      assignedAppsRes
    ] = await Promise.all([
      supabase.from("workers").select("full_name, email, phone, bank_account, line_id").eq("id", workerId).single(),
      supabase.from("contract_templates").select("id").eq("type", "BASIC").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("job_applications").select("id, actual_work_start").eq("worker_id", workerId).not("actual_work_start", "is", null).gte("actual_work_start", startOfMonth.toISOString()).lte("actual_work_start", endOfMonth.toISOString()),
      supabase.from("job_applications").select("jobs(reward_amount)").eq("worker_id", workerId).in("status", ["CONFIRMED", "COMPLETED"]).gte("scheduled_work_start", startOfMonth.toISOString()).lte("scheduled_work_start", endOfMonth.toISOString()),
      supabase.from("job_applications").select("status").eq("worker_id", workerId).in("status", ["APPLIED", "ASSIGNED", "CONFIRMED"]),
      supabase.from("job_applications").select("id, scheduled_work_start, scheduled_work_end, jobs(id, title, address_text, clients(name))").eq("worker_id", workerId).in("status", ["ASSIGNED", "CONFIRMED"]).gte("scheduled_work_start", now.toISOString()).lte("scheduled_work_start", sevenDaysLater.toISOString()).order("scheduled_work_start"),
      supabase.from("job_applications").select("id, actual_work_end, jobs(id, title, reward_amount), reports(id, status)").eq("worker_id", workerId).eq("status", "COMPLETED").not("actual_work_end", "is", null).order("actual_work_end", { ascending: false }).limit(5),
      supabase.from("announcements").select("*").eq("is_active", true).or(`expires_at.is.null,expires_at.gte.${now.toISOString()}`).order("created_at", { ascending: false }).limit(3),
      supabase.from("payment_notices").select("id").eq("worker_id", workerId).eq("status", "ISSUED").limit(1),
      supabase.from("job_individual_contracts").select("id, worker_id, job_applications(jobs(title))").eq("status", "PENDING").eq("worker_id", workerId),
      supabase.from("job_applications").select("id, scheduled_work_start, scheduled_work_end, jobs(id, title, start_time)").eq("worker_id", workerId).in("status", ["ASSIGNED", "CONFIRMED"])
    ]);

    const worker = workerRes.data;
    const template = templateRes.data;
    const completedWork = completedWorkRes.data;
    const earningsData = earningsRes.data;
    const applications = applicationsRes.data;
    const schedule = scheduleRes.data;
    const recentActivityData = recentActivityRes.data;
    const announcementsData = announcementsRes.data;
    const pendingNotices = pendingNoticesRes.data;
    const myPendingContracts = pendingContractsRes.data;
    const assignedApplications = assignedAppsRes.data;

    // Process Worker Info
    if (worker) {
      workerName = worker.full_name;
      showBankAccountAlert = !worker.bank_account;
      showLineAlert = !worker.line_id;

      // Profile Completion Stats
      const checks = [
        { field: worker.full_name, label: "氏名" },
        { field: worker.email, label: "メールアドレス" },
        { field: worker.phone, label: "電話番号" },
        { field: worker.bank_account, label: "口座情報" },
        { field: worker.line_id, label: "LINE連携" },
      ];
      checks.forEach(check => {
        if (check.field) profileCompletion += 1;
        else incompleteItems.push(check.label);
      });
    }

    // Process Contract Alert (Async part needed if template exists)
    if (template) {
      const { data: contract } = await supabase
        .from("worker_basic_contracts")
        .select("id, status")
        .eq("worker_id", workerId)
        .eq("template_id", template.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!contract || contract.status === 'PENDING') {
        showContractAlert = true;
        incompleteItems.push("利用規約");
      } else {
        profileCompletion += 1;
      }
    }
    profileCompletion = Math.round((profileCompletion / 6) * 100);

    // Process Stats
    workDaysThisMonth = completedWork?.length || 0;
    if (earningsData) {
      earningsThisMonth = earningsData.reduce((sum, app: any) => {
        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
        return sum + (job?.reward_amount || 0);
      }, 0);
    }
    if (applications) {
      appliedCount = applications.filter(app => app.status === "APPLIED").length;
      confirmedCount = applications.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED").length;
    }

    upcomingSchedule = schedule || [];
    recentActivity = recentActivityData || [];
    showPaymentNoticeAlert = (pendingNotices?.length || 0) > 0;
    pendingIndividualContracts = myPendingContracts || [];

    // Process Announcements with Read Status (Batch fetch)
    if (announcementsData && announcementsData.length > 0) {
      const announcementIds = announcementsData.map(a => a.id);
      const { data: readStatuses } = await supabase
        .from("worker_announcement_reads")
        .select("announcement_id")
        .eq("worker_id", workerId)
        .in("announcement_id", announcementIds);

      const readIdSet = new Set(readStatuses?.map(r => r.announcement_id) || []);
      announcementsWithReadStatus = announcementsData.map(a => ({
        ...a,
        isRead: readIdSet.has(a.id)
      }));
    }

    // Process Overdue/Schedule alerts
    if (assignedApplications) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      for (const app of assignedApplications) {
        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
        if (!job) continue;

        const jobStartTime = new Date(job.start_time);
        const scheduledEnd = app.scheduled_work_end ? new Date(app.scheduled_work_end) : null;

        // Only show alerts for future or very recent items (within last 7 days)
        const isRecentOrFuture = jobStartTime > sevenDaysAgo;

        if (!app.scheduled_work_start || !app.scheduled_work_end) {
          // Future job without schedule - only alert if it's recent or in the future
          if (isRecentOrFuture) {
            applicationsNeedingSchedule.push(app);
          }
        } else if (scheduledEnd && isRecentOrFuture && scheduledEnd < now) {
          // Recent past job without report
          const { data: report } = await supabase
            .from("reports")
            .select("id")
            .eq("application_id", app.id)
            .maybeSingle();

          if (!report) {
            applicationsOverdue.push(app);
          }
        }
      }
    }
  }

  // Helper function to format date
  const formatScheduleDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return { date: `${month}/${day} (${weekday})`, time: `${hours}:${minutes}` };
  };

  if (!workerId) {
    return (
      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
          <div className="text-xl font-black text-slate-900 flex items-center gap-2">
            <img src="/app-icon.png" alt="Teo Work" className="w-8 h-8 object-contain" />
            Teo Work
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-yellow-600 transition-colors">ログイン</Link>
            <Link href="/register" className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-slate-800 transition-all shadow-sm">
              新規登録
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-20 pb-16 px-6 overflow-hidden min-h-[80vh] flex flex-col justify-center">
          {/* Decorative backgrounds */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-yellow-100/50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-orange-100/50 rounded-full blur-3xl opacity-50" />

          <div className="max-w-2xl mx-auto text-center relative z-10 -mt-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-bold mb-6 border border-yellow-100">
              <Sparkles className="w-3 h-3" />
              <span>スキマ時間で賢く稼ぐ</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight mb-6">
              世の中の副業を<br />
              <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent italic">
                もっと手軽に
              </span>
            </h1>
            <p className="text-slate-600 text-lg mb-10 leading-relaxed max-w-lg mx-auto">
              Teo Workは、面接なしですぐに働ける<br className="hidden sm:block" />
              次世代のワークプラットフォームです。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-yellow-400 text-slate-900 px-8 py-4 rounded-2xl font-black text-lg hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-100 group">
                今すぐ無料で始める
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="w-full sm:w-auto text-slate-500 font-bold hover:text-slate-900 py-4 transition-colors">
                すでにアカウントをお持ちの方
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">© 2026 Teo Work. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg text-slate-900">Teo Work</h1>
          {workerId ? (
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-900">{workerName}</span> さん
            </div>
          ) : (
            <Link href="/login" className="text-sm font-bold text-blue-600">ログイン</Link>
          )}
        </div>
      </header>

      {/* Auth Success Message */}
      <AuthSuccessMessage />

      {/* Contract Alert (Basic) */}
      {showContractAlert && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-800 text-sm">利用規約への同意が必要です</h3>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                お仕事に応募するには、利用規約への同意が必要です。
                <br />
                内容をご確認の上、同意をお願いします。
              </p>
              <Link
                href="/contracts/basic"
                className="inline-block mt-3 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                利用規約を確認する
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Contract Alert (Individual) */}
      {pendingIndividualContracts.length > 0 && (
        <div className="max-w-md mx-auto px-4 mt-4 space-y-3">
          {pendingIndividualContracts.map((contract) => (
            <div key={contract.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 text-sm">個別契約の確認依頼があります</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  案件: {Array.isArray(contract.job_applications) ? contract.job_applications[0]?.jobs?.title : contract.job_applications?.jobs?.title || "案件名不明"}
                  <br />
                  内容をご確認の上、署名をお願いします。
                </p>
                <Link
                  href={`/contracts/individual/${contract.id}`}
                  className="inline-block mt-3 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  契約書を確認する
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Needed Alert */}
      {applicationsNeedingSchedule.length > 0 && (
        <div className="max-w-md mx-auto px-4 mt-4 space-y-3">
          {applicationsNeedingSchedule.map((app) => (
            <div key={app.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-800 text-sm">作業予定日の設定が必要です</h3>
                <p className="text-xs text-yellow-700 mt-1 leading-relaxed">
                  案件: {app.jobs?.title || "案件名不明"}
                  <br />
                  作業予定日を設定してください。
                </p>
                <Link
                  href={`/applications/${app.id}/schedule`}
                  className="inline-block mt-3 bg-yellow-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  予定日を設定する
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overdue Report Alert */}
      {applicationsOverdue.length > 0 && (
        <div className="max-w-md mx-auto px-4 mt-4 space-y-3">
          {applicationsOverdue.map((app) => (
            <div key={app.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-orange-800 text-sm">作業報告の提出が必要です</h3>
                <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                  案件: {app.jobs?.title || "案件名不明"}
                  <br />
                  作業予定日を過ぎています。作業報告を提出してください。
                </p>
                <Link
                  href={`/jobs/${app.jobs?.id}`}
                  className="inline-block mt-3 bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  作業報告を提出する
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bank Account Alert */}
      {
        showBankAccountAlert && (
          <div className="max-w-md mx-auto px-4 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 text-sm">口座情報の登録が必要です</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  報酬を受け取るために、銀行口座の登録をお願いします。
                </p>
                <Link
                  href="/settings/bank"
                  className="inline-block mt-3 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  口座情報を登録する
                </Link>
              </div>
            </div>
          </div>
        )
      }

      {/* LINE Connection Alert */}
      {
        showLineAlert && (
          <div className="max-w-md mx-auto px-4 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 text-sm">LINE連携が必要です</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  採用通知などの重要なお知らせをLINEで受け取るために、LINE連携をお願いします。
                </p>
                <Link
                  href="/settings/line"
                  className="inline-block mt-3 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  LINE連携する
                </Link>
              </div>
            </div>
          </div>
        )
      }

      {/* Payment Notice Alert */}
      {showPaymentNoticeAlert && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-800 text-sm">確認待ちの支払明細があります</h3>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                今月分の支払明細が発行されました。
                <br />
                内容を確認し、承認をお願いします。
              </p>
              <Link
                href="/payments"
                className="inline-block mt-3 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                明細を確認・承認する
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Dashboard Statistics */}
        {workerId && (
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 mb-4 text-sm">今月の活動</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">稼働日数</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{workDaysThisMonth}日</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">報酬見込み</span>
                </div>
                <div className="text-2xl font-bold text-green-900">¥{earningsThisMonth.toLocaleString()}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Briefcase className="w-4 h-4" />
                  <span className="text-xs font-medium">応募中</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{appliedCount}件</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">確定済み</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{confirmedCount}件</div>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Schedule */}
        {workerId && (
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              今後の予定
            </h2>
            {upcomingSchedule.length > 0 ? (
              <div className="space-y-3">
                {upcomingSchedule.map((schedule) => {
                  const job = Array.isArray(schedule.jobs) ? schedule.jobs[0] : schedule.jobs;
                  const client = job?.clients ? (Array.isArray(job.clients) ? job.clients[0] : job.clients) : null;
                  const startDate = formatScheduleDate(schedule.scheduled_work_start);
                  const endTime = new Date(schedule.scheduled_work_end).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <Link
                      key={schedule.id}
                      href={`/jobs/${job?.id}`}
                      className="block border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm font-bold text-slate-900">{startDate.date}</div>
                        <div className="text-xs text-slate-500">{startDate.time} - {endTime}</div>
                      </div>
                      <div className="text-sm font-medium text-slate-700">{job?.title}</div>
                      {client && (
                        <div className="text-xs text-slate-500 mt-1">{client.name}</div>
                      )}
                      {job?.address_text && (
                        <div className="text-xs text-slate-500 mt-1">📍 {job.address_text}</div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">今後7日間の予定はありません</p>
            )}
          </section>
        )}

        {/* Quick Actions */}
        {workerId && (
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 mb-4 text-sm">クイックアクション</h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Hidden for Phase 1
              <Link
                href="/jobs"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Search className="w-6 h-6 text-blue-600" />
                <span className="text-xs font-medium text-slate-700">案件を探す</span>
              </Link>
              */}
              <Link
                href="/applications"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Briefcase className="w-6 h-6 text-purple-600" />
                <span className="text-xs font-medium text-slate-700">応募履歴</span>
              </Link>
              <Link
                href="/reports"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-6 h-6 text-green-600" />
                <span className="text-xs font-medium text-slate-700">作業報告</span>
              </Link>
              <Link
                href="/payments"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <JapaneseYen className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-slate-600">支払明細</span>
              </Link>
              <Link
                href="/settings"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-6 h-6 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">設定</span>
              </Link>
            </div>
          </section>
        )}

        {/* Phase 2: Recent Activity */}
        {workerId && recentActivity && recentActivity.length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              最近の活動
            </h2>
            <div className="space-y-3">
              {recentActivity.map((activity: any) => {
                const job = Array.isArray(activity.jobs) ? activity.jobs[0] : activity.jobs;
                const report = activity.reports && activity.reports.length > 0 ? activity.reports[0] : null;
                const completedDate = new Date(activity.actual_work_end);
                const formattedDate = `${completedDate.getMonth() + 1}/${completedDate.getDate()}`;

                return (
                  <Link
                    key={activity.id}
                    href={`/jobs/${job?.id}`}
                    className="block border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-slate-700">{job?.title}</span>
                      </div>
                      <span className="text-xs text-slate-500">{formattedDate}完了</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600 font-medium">報酬: ¥{job?.reward_amount?.toLocaleString()}</span>
                      {report ? (
                        <span className="text-blue-600">📋 報告済み</span>
                      ) : (
                        <span className="text-orange-600">📋 報告待ち</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link
              href="/applications"
              className="block text-center text-sm text-blue-600 font-medium mt-4 hover:underline"
            >
              すべての履歴を見る →
            </Link>
          </section>
        )}

        {/* Phase 2: Announcements */}
        {workerId && announcementsWithReadStatus && announcementsWithReadStatus.length > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              お知らせ
            </h2>
            <div className="space-y-3">
              {announcementsWithReadStatus.map((announcement: any) => {
                const createdDate = new Date(announcement.created_at);
                const formattedDate = `${createdDate.getMonth() + 1}/${createdDate.getDate()}`;
                const typeIcon = announcement.type === 'IMPORTANT' ? '🔔' : announcement.type === 'WARNING' ? '⚠️' : 'ℹ️';
                const typeColor = announcement.type === 'IMPORTANT' ? 'text-red-600' : announcement.type === 'WARNING' ? 'text-orange-600' : 'text-blue-600';

                return (
                  <div
                    key={announcement.id}
                    className={`border rounded-lg p-3 ${announcement.isRead ? 'border-slate-100 bg-slate-50' : 'border-blue-200 bg-blue-50'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeIcon}</span>
                        <span className={`text-sm font-medium ${typeColor}`}>{announcement.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{formattedDate}</span>
                        {!announcement.isRead && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">未読</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{announcement.content}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Phase 2: Profile Completion */}
        {workerId && profileCompletion < 100 && (
          <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4">
            <h2 className="font-bold text-slate-900 mb-4 text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              プロフィール完成度
            </h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-blue-600">{profileCompletion}%</span>
                <span className="text-xs text-slate-600">完成まであと少し！</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
            {incompleteItems.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-700 mb-2">未完了の項目：</p>
                <ul className="space-y-1">
                  {incompleteItems.map((item, index) => (
                    <li key={index} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-600 mb-3">
              プロフィールを完成させると、案件に採用されやすくなります
            </p>
            <Link
              href="/settings"
              className="block text-center bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              プロフィールを編集する
            </Link>
          </section>
        )}

        {/* New Jobs - Hidden for Phase 1 */}
        {/* <section>
          <h2 className="font-bold text-slate-900 mb-4">新着の案件</h2>
          <div className="space-y-4">
            {jobs?.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            {(!jobs || jobs.length === 0) && (
              <p className="text-center text-slate-500 py-8 text-sm">
                現在募集中の案件はありません。
              </p>
            )}
          </div>
        </section> */}
      </main>
    </div >
  );
}
