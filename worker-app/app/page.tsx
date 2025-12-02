import { JobCard } from "@/components/JobCard";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";
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
  }

  // Check for pending individual contracts
  let pendingIndividualContracts: any[] = [];
  if (workerId) {
    const { data: pendingContracts } = await supabase
      .from("job_individual_contracts")
      .select(`
            id,
            job_applications (
                jobs (title)
            )
        `)
      .order("created_at", { ascending: false });

    // Filter by worker_id via application relation is hard in one query without complex joins or RPC
    // So we fetch by application_id where worker_id matches.
    // Actually, we can join job_applications and filter by worker_id there.
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
