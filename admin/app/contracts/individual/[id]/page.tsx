import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, FileSignature, ShieldCheck, Clock, Globe, Hash, Building2, Briefcase } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import WorkerContractNotificationButton from "@/components/contracts/WorkerContractNotificationButton";

export default async function IndividualContractDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;
    const supabase = await createClient();

    const { data: contract, error } = await supabase
        .from("job_individual_contracts")
        .select(`
            *,
            contract_templates(title, version),
            worker:workers (
                id,
                full_name,
                email,
                address,
                phone_number
            ),
            job_applications (
                workers (full_name, email),
                jobs (
                    title,
                    salary_amount,
                    salary_type,
                    daily_salary,
                    hourly_salary,
                    clients (name)
                )
            )
        `)
        .eq("id", id)
        .single();

    if (error || !contract) {
        // console.error("Error fetching individual contract:", error);
        notFound();
    }

    // Determine worker: Try direct relationship first, fallback to application's worker (migration support)
    // Note: The direct 'worker' relation assumes the migration has been run and foreign key exists.
    // If not yet run, 'worker' field in contract might be null, but 'workers' object from select might be present if inferred.
    // However, since we used 'worker:workers', it expects 'worker_id' on contract.
    // Fallback logic:
    // @ts-ignore
    const worker = contract.worker || contract.job_applications?.workers;

    // Determine job: Only exists if linked via application
    // @ts-ignore
    const job = contract.job_applications?.jobs;

    if (!worker) {
        return (
            <AdminLayout>
                <div className="p-8 text-center text-red-500">
                    ワーカー情報が見つかりません。
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/contracts?tab=individual"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold tracking-tight">個別契約書詳細・証跡</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="font-medium text-lg">{worker.full_name} 様</p>
                            {job && <span className="text-slate-400 text-sm">- {job.title}</span>}
                        </div>
                        <p className="text-muted-foreground text-xs font-mono mt-1">ID: {contract.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <WorkerContractNotificationButton
                            contractId={id}
                            // @ts-ignore
                            sentAt={contract.notification_sent_at}
                        />
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content: The Contract Text */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-xl border border-border shadow-sm">
                            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <FileSignature className="w-8 h-8 text-slate-900" />
                                    <div>
                                        {/* @ts-ignore */}
                                        <h3 className="font-bold text-xl">{contract.contract_templates?.title}</h3>
                                        {/* @ts-ignore */}
                                        <p className="text-sm text-muted-foreground">Version {contract.contract_templates?.version}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">締結日</div>
                                    <div className="font-bold">{formatDate(contract.signed_at)}</div>
                                </div>
                            </div>

                            {/* Worker Info Block (Always Visible) */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium border-b border-slate-200 pb-2 mb-2">
                                    <Briefcase className="w-4 h-4 text-slate-500" />
                                    <span>ワーカー情報</span>
                                </div>
                                <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                    <span className="text-slate-500">氏名</span>
                                    <span className="font-medium">{worker.full_name}</span>
                                </div>
                                <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                    <span className="text-slate-500">Email</span>
                                    <span className="font-mono text-xs">{worker.email}</span>
                                </div>
                                {worker.address && (
                                    <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                        <span className="text-slate-500">住所</span>
                                        <span>{worker.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* Job Info Block (Optional) */}
                            {job ? (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium border-b border-slate-200 pb-2 mb-2">
                                        <Building2 className="w-4 h-4 text-slate-500" />
                                        <span>案件情報</span>
                                    </div>
                                    <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                        <span className="text-slate-500">案件名</span>
                                        <span className="font-medium">{job.title}</span>
                                    </div>
                                    <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                        <span className="text-slate-500">クライアント</span>
                                        <span>{job.clients?.name}</span>
                                    </div>
                                    <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                                        <span className="text-slate-500">金額</span>
                                        <span>
                                            {job.salary_amount?.toLocaleString()}円
                                            {job.salary_type === "HOURLY" ? "/時" :
                                                job.salary_type === "DAILY" ? "/日" :
                                                    job.salary_type === "MONTHLY" ? "/月" : ""}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 text-sm text-slate-500 flex items-center justify-center">
                                    案件指定なし（ワーカー個別契約）
                                </div>
                            )}

                            <div className="prose prose-sm max-w-none prose-slate">
                                <div className="whitespace-pre-wrap font-serif leading-relaxed p-4 bg-slate-50 rounded border border-slate-100">
                                    {contract.signed_content_snapshot || "署名されたコンテンツはありません"}
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-border">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-sm font-bold mb-1">乙（受託者）</p>
                                        <p className="text-lg">{worker.full_name} 殿</p>
                                        <p className="text-sm text-muted-foreground">{worker.email}</p>
                                    </div>
                                    {contract.status === 'SIGNED' && (
                                        <div className="h-20 w-20 border-2 border-red-200 rounded-full flex items-center justify-center text-red-300 font-serif transform -rotate-12 select-none">
                                            電子署名済
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Audit Log */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-green-600" />
                                監査ログ・証跡
                            </h3>

                            {contract.status === 'SIGNED' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> 締結日時 (Timestamp)
                                        </label>
                                        <div className="text-sm font-mono bg-slate-50 p-2 rounded border border-slate-100">
                                            {new Date(contract.signed_at).toISOString()}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> IPアドレス
                                        </label>
                                        <div className="text-sm font-mono bg-slate-50 p-2 rounded border border-slate-100">
                                            {contract.ip_address || "Unknown"}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> User Agent
                                        </label>
                                        <div className="text-xs font-mono bg-slate-50 p-2 rounded border border-slate-100 break-all">
                                            {contract.user_agent || "Unknown"}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    まだ署名されていません。
                                </div>
                            )}

                            <div className="pt-4 border-t border-border">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    この記録は、ユーザーが本契約に同意した際のシステムログです。
                                    法的紛争時の証拠として使用される可能性があります。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
