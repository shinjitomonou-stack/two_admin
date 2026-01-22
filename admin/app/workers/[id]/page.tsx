import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, ShieldCheck, ShieldAlert, Mail, Phone, Calendar, CreditCard, Edit, FileText, Tag } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
import ResetWorkerPassword from "@/components/ResetWorkerPassword";

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



    // 1. Get application IDs for this worker
    const { data: applications } = await supabase
        .from("job_applications")
        .select("id")
        .eq("worker_id", id);

    const applicationIds = applications?.map(app => app.id) || [];

    // 2. Get contracts
    // Fetch directly by worker_id (new schema) and also include those by application_id (legacy support if needed, but worker_id backfill should cover it)
    // Actually, simply fetching by worker_id is sufficient if we assume backfill.
    // However, to be safe during transition, we can query both... but easier to just rely on worker_id being populated.
    // If we strictly follow the new schema:
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
                        <Link
                            href={`/workers/${worker.id}/edit?returnTo=/workers/${worker.id}`}
                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                        >
                            <Edit className="w-4 h-4" />
                            編集する
                        </Link>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
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

