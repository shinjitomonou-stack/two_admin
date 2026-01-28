import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, ShieldCheck, ShieldAlert, Mail, Phone, Calendar, CreditCard, Edit, FileText, Tag, Briefcase } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
import ResetWorkerPassword from "@/components/ResetWorkerPassword";
import WorkerDetailActions from "@/components/WorkerDetailActions"; // We need to create this

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: worker, error } = await supabase
        .from("workers")
        .select("*")
        .eq("id", id)
        .single();

    const { data: contract } = await supabase
        .from("worker_basic_contracts")
        .select("status, signed_at")
        .eq("worker_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const { data: individualContracts } = await supabase
        .from("job_individual_contracts")
        .select(`
            *,
            contract_templates(title),
            job_applications (
                jobs (title)
            )
        `)
        .eq("worker_id", id)
        .order("created_at", { ascending: false });
    // 3. Get Statistics and Job Lists
    const { data: statsData } = await supabase
        .from("job_applications")
        .select(`
            status,
            jobs (reward_amount, reward_tax_mode),
            reports (reward_amount, status)
        `)
        .eq("worker_id", id);

    // Filter approved reports for earnings
    const approvedReports = statsData?.flatMap(a => a.reports ? [a.reports] : []).filter(r => (r as any).status === 'APPROVED') || [];
    const totalEarnings = approvedReports.reduce((sum, r: any) => sum + (r.reward_amount || 0), 0);

    const completedCount = statsData?.filter(a => a.status === 'COMPLETED').length || 0;
    const plannedCount = statsData?.filter(a => ['ASSIGNED', 'CONFIRMED'].includes(a.status)).length || 0;

    // Planned Jobs
    const { data: plannedJobs } = await supabase
        .from("job_applications")
        .select(`
            *,
            jobs (title, start_time, end_time, address_text, reward_amount, reward_tax_mode)
        `)
        .eq("worker_id", id)
        .in("status", ["ASSIGNED", "CONFIRMED"])
        .order("scheduled_work_start", { ascending: true });

    // Completed Jobs
    const { data: completedJobs } = await supabase
        .from("job_applications")
        .select(`
            *,
            jobs (title, start_time, end_time, address_text, reward_amount, reward_tax_mode),
            reports (id, status, reward_amount)
        `)
        .eq("worker_id", id)
        .eq("status", "COMPLETED")
        .order("scheduled_work_start", { ascending: false });

    if (error || !worker) {
        notFound();
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/workers"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold tracking-tight">{worker.full_name}</h2>
                            <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">
                                {worker.worker_number || "-"}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-[10px] font-mono mt-1 opacity-50">System ID: {worker.id}</p>
                    </div>
                    <div className="ml-auto">
                        <WorkerDetailActions workerId={worker.id} workerName={worker.full_name} />
                    </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">稼働予定件数</label>
                            <div className="text-2xl font-bold text-slate-900">
                                {plannedCount} <span className="text-sm font-normal text-slate-400 ml-1">件</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                            <CheckCircleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">稼働件数実績</label>
                            <div className="text-2xl font-bold text-slate-900">
                                {completedCount} <span className="text-sm font-normal text-slate-400 ml-1">件</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                            <BanknoteIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 block mb-1">累計報酬額</label>
                            <div className="text-2xl font-bold text-slate-900">
                                ¥{totalEarnings.toLocaleString()} <span className="text-sm font-normal text-slate-400 ml-1">（税込）</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Planned Jobs */}
                        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-border flex items-center justify-between">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-500" />
                                    実施予定案件
                                </h3>
                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">直近の予定</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-border text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">作業日 / 案件名</th>
                                            <th className="px-6 py-3 font-medium">時間</th>
                                            <th className="px-6 py-3 font-medium">報酬額</th>
                                            <th className="px-6 py-3 font-medium text-right">状態</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {plannedJobs && plannedJobs.length > 0 ? (
                                            plannedJobs.map((app: any) => (
                                                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900">{formatDate(app.scheduled_work_start || app.jobs?.start_time)}</div>
                                                        <Link href={`/jobs/${app.job_id}`} className="text-blue-600 hover:underline text-xs line-clamp-1 mt-0.5">
                                                            {app.jobs?.title}
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {formatDateTime(app.scheduled_work_start || app.jobs?.start_time).split(" ")[1]} 〜
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">
                                                        ¥{Math.round(app.jobs?.reward_amount * (app.jobs?.reward_tax_mode === 'INCL' ? 1 : 1.1)).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded text-[10px] font-bold",
                                                            app.status === 'CONFIRMED' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {app.status === 'CONFIRMED' ? '確定' : '採用'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-10 text-center text-slate-400">予定されている案件はありません</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Completed Jobs */}
                        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-border flex items-center justify-between">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-green-500" />
                                    実施済案件
                                </h3>
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">直近10件を表示</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-border text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">作業日 / 案件名</th>
                                            <th className="px-6 py-3 font-medium">実績報酬</th>
                                            <th className="px-6 py-3 font-medium text-right">報告状況</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {completedJobs && completedJobs.length > 0 ? (
                                            completedJobs.slice(0, 10).map((app: any) => (
                                                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-700">{formatDate(app.scheduled_work_start || app.jobs?.start_time)}</div>
                                                        <div className="text-slate-500 text-xs line-clamp-1 mt-0.5">{app.jobs?.title}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900">
                                                            ¥{(app.reports?.[0]?.reward_amount || Math.round(app.jobs?.reward_amount * (app.jobs?.reward_tax_mode === 'INCL' ? 1 : 1.1))).toLocaleString()}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">確定報酬</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={cn(
                                                            "px-2 py-1 rounded text-[10px] font-bold",
                                                            app.reports?.[0]?.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                                                                app.reports?.[0]?.status === 'REJECTED' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                                                        )}>
                                                            {app.reports?.[0]?.status === 'APPROVED' ? '承認済' :
                                                                app.reports?.[0]?.status === 'REJECTED' ? '非承認' : '報告済'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-10 text-center text-slate-400">完了した案件はありません</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-lg">基本情報</h3>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">氏名 (カナ)</label>
                                    <div className="text-sm">{worker.name_kana || "未登録"}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">メールアドレス</label>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        {worker.email}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">電話番号</label>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        {worker.phone || "未登録"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">LINE名 / ID</label>
                                    <div className="text-sm">
                                        {worker.line_name || "未登録"}
                                        {worker.line_id && <span className="text-muted-foreground ml-2">({worker.line_id})</span>}
                                    </div>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">住所</label>
                                    <div className="text-sm">
                                        {worker.postal_code && <span className="mr-2">〒{worker.postal_code}</span>}
                                        {worker.address || "未登録"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">性別</label>
                                    <div className="text-sm">
                                        {worker.gender === 'male' ? '男性' : worker.gender === 'female' ? '女性' : worker.gender || "未登録"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">生年月日</label>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {formatDate(worker.birth_date)}
                                    </div>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">タグ</label>
                                    <div className="flex flex-wrap gap-2">
                                        {worker.tags && worker.tags.length > 0 ? (
                                            worker.tags.map((tag: string, i: number) => (
                                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    <Tag className="w-3 h-3" />
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-slate-400">タグなし</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                                <h3 className="font-semibold text-lg">銀行口座情報</h3>
                                <div className="flex items-start gap-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                                    <CreditCard className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        {worker.bank_account ? (
                                            <pre className="font-sans whitespace-pre-wrap">
                                                {JSON.stringify(worker.bank_account, null, 2)}
                                            </pre>
                                        ) : (
                                            <p>口座情報は登録されていません。</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Individual Contracts List */}
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-lg">個別契約一覧</h3>
                            <div className="space-y-4">
                                {individualContracts && individualContracts.length > 0 ? (
                                    individualContracts.map((contract) => (
                                        <div key={contract.id} className="p-3 bg-slate-50 rounded-lg space-y-2">
                                            <div className="flex items-center justify-between">
                                                {/* @ts-ignore */}
                                                <div className="font-medium text-sm">{contract.job_applications?.jobs?.title}</div>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${contract.status === 'SIGNED' ? 'bg-green-100 text-green-700' :
                                                    contract.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {contract.status === 'SIGNED' ? '締結済' :
                                                        contract.status === 'REJECTED' ? '却下' : '未締結'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{formatDate(contract.created_at)}</span>
                                                {contract.status === 'SIGNED' && (
                                                    <Link
                                                        href={`/contracts/individual/${contract.id}`}
                                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                        詳細
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">個別契約はありません。</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Status */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-lg">ステータス</h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium">本人確認</span>
                                    {worker.is_verified ? (
                                        <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                                            <ShieldCheck className="w-4 h-4" />
                                            確認済み
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-orange-500 text-xs font-bold">
                                            <ShieldAlert className="w-4 h-4" />
                                            未確認
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium">登録日</span>
                                    <span className="text-xs text-slate-500">
                                        {formatDate(worker.created_at)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium">基本契約</span>
                                    {contract?.status === 'SIGNED' ? (
                                        <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                                            <FileText className="w-4 h-4" />
                                            締結済み
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-orange-500 text-xs font-bold">
                                            <FileText className="w-4 h-4" />
                                            未締結
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <button className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                                ステータスを更新
                            </button>
                            <ResetWorkerPassword workerId={worker.id} />
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout >
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}

function BanknoteIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    )
}

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

