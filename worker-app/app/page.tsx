import { JobCard } from "@/components/JobCard";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AlertTriangle, Calendar, Briefcase, TrendingUp, Search, FileText, Settings, Clock } from "lucide-react";
import { AuthSuccessMessage } from "@/components/AuthSuccessMessage";

export default async function Home() {
  const supabase = await createClient();

  // Get authenticated user from Supabase Auth
  const { data: { user } } = await supabase.auth.getUser();
  const workerId = user?.id;

  // Check for unsigned contract if logged in
  let showContractAlert = false;
  let showBankAccountAlert = false;
  let showLineAlert = false;
  let workerName = "";

  // Dashboard statistics
  let workDaysThisMonth = 0;
  let earningsThisMonth = 0;
  let appliedCount = 0;
  let confirmedCount = 0;
  let upcomingSchedule: any[] = [];

  if (workerId) {
    // Fetch worker details
    const { data: worker } = await supabase
      .from("workers")
      .select("full_name, bank_account, line_user_id")
      .eq("id", workerId)
      .single();

    if (worker) {
      workerName = worker.full_name;
      if (!worker.bank_account) {
        showBankAccountAlert = true;
      }
      if (!worker.line_user_id) {
        showLineAlert = true;
      }
    }

    // Get active basic template
    const { data: template } = await supabase
      .from("contract_templates")
      .select("id")
      .eq("type", "BASIC")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (template) {
      // Check for basic contract (PENDING or SIGNED)
      const { data: contract } = await supabase
        .from("worker_basic_contracts")
        .select("id, status")
        .eq("worker_id", workerId)
        .eq("template_id", template.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Show alert if no contract OR status is PENDING
      if (!contract || contract.status === 'PENDING') {
        showContractAlert = true;
      }
    }

    // Calculate dashboard statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // This month's work days (completed work)
    const { data: completedWork } = await supabase
      .from("job_applications")
      .select("id, actual_work_start")
      .eq("worker_id", workerId)
      .not("actual_work_start", "is", null)
      .gte("actual_work_start", startOfMonth.toISOString())
      .lte("actual_work_start", endOfMonth.toISOString());

    workDaysThisMonth = completedWork?.length || 0;

    // This month's earnings (confirmed and completed work)
    const { data: earningsData } = await supabase
      .from("job_applications")
      .select("jobs(reward_amount)")
      .eq("worker_id", workerId)
      .in("status", ["CONFIRMED", "COMPLETED"])
      .gte("scheduled_work_start", startOfMonth.toISOString())
      .lte("scheduled_work_start", endOfMonth.toISOString());

    if (earningsData) {
      earningsThisMonth = earningsData.reduce((sum, app: any) => {
        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
        return sum + (job?.reward_amount || 0);
      }, 0);
    }

    // Application counts
    const { data: applications } = await supabase
      .from("job_applications")
      .select("status")
      .eq("worker_id", workerId)
      .in("status", ["APPLIED", "ASSIGNED", "CONFIRMED"]);

    if (applications) {
      appliedCount = applications.filter(app => app.status === "APPLIED").length;
      confirmedCount = applications.filter(app => app.status === "ASSIGNED" || app.status === "CONFIRMED").length;
    }

    // Upcoming schedule (next 7 days)
    const { data: schedule } = await supabase
      .from("job_applications")
      .select(`
        id,
        scheduled_work_start,
        scheduled_work_end,
        jobs(id, title, address_text, clients(name))
      `)
      .eq("worker_id", workerId)
      .in("status", ["ASSIGNED", "CONFIRMED"])
      .gte("scheduled_work_start", now.toISOString())
      .lte("scheduled_work_start", sevenDaysLater.toISOString())
      .order("scheduled_work_start");

    upcomingSchedule = schedule || [];
  }

  // Check for pending individual contracts
  let pendingIndividualContracts: any[] = [];
  if (workerId) {
    const { data: myPendingContracts } = await supabase
      .from("job_individual_contracts")
      .select(`
            id,
            job_applications!inner (
                worker_id,
                jobs (title)
            )
        `)
      .eq("status", "PENDING")
      .eq("job_applications.worker_id", workerId);

    if (myPendingContracts) {
      pendingIndividualContracts = myPendingContracts;
    }
  }

  // Check for applications needing schedule
  let applicationsNeedingSchedule: any[] = [];
  let applicationsOverdue: any[] = [];

  if (workerId) {
    const { data: assignedApplications } = await supabase
      .from("job_applications")
      .select(`
        id,
        scheduled_work_start,
        scheduled_work_end,
        jobs (
          id,
          title
        )
      `)
      .eq("worker_id", workerId)
      .in("status", ["ASSIGNED", "CONFIRMED"]);

    if (assignedApplications) {
      const now = new Date();

      for (const app of assignedApplications) {
        // Check if schedule is missing
        if (!app.scheduled_work_start || !app.scheduled_work_end) {
          applicationsNeedingSchedule.push(app);
        }
        // Check if overdue (scheduled end time has passed)
        else if (new Date(app.scheduled_work_end) < now) {
          // Check if report exists
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

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      *,
      clients (
        name,
        address
      )
    `)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs:", error);
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
              <h3 className="font-bold text-red-800 text-sm">基本契約の締結が必要です</h3>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                お仕事に応募するには、基本契約への同意が必要です。
                <br />
                内容をご確認の上、締結をお願いします。
              </p>
              <Link
                href="/contracts/basic"
                className="inline-block mt-3 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                契約書を確認する
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
                  案件: {contract.job_applications.jobs.title}
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
                  案件: {app.jobs.title}
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
                  案件: {app.jobs.title}
                  <br />
                  作業予定日を過ぎています。作業報告を提出してください。
                </p>
                <Link
                  href={`/jobs/${app.jobs.id}`}
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
              <Link
                href="/jobs"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Search className="w-6 h-6 text-blue-600" />
                <span className="text-xs font-medium text-slate-700">案件を探す</span>
              </Link>
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
                href="/settings"
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-6 h-6 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">設定</span>
              </Link>
            </div>
          </section>
        )}

        {/* New Jobs */}
        <section>
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
        </section>
      </main>
    </div >
  );
}
