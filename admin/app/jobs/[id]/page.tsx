import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, MapPin, Calendar, Clock, Users, JapaneseYen, Building2, Edit, Banknote, Plus, FileText } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, formatTime } from "@/lib/utils";
import { ApplicationList } from "@/components/ApplicationList";
import { JobStatusSelect } from "@/components/JobStatusSelect";
import { LinkExistingContractButton } from "@/components/LinkExistingContractButton";
import { JobDetailActions } from "@/components/JobDetailActions";

const STATUS_STYLES = {
    APPLIED: "bg-blue-100 text-blue-700",
    ASSIGNED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700",
    CONFIRMED: "bg-purple-100 text-purple-700",
};

const STATUS_LABELS = {
    APPLIED: "応募中",
    ASSIGNED: "採用",
    REJECTED: "不採用",
    CANCELLED: "辞退",
    CONFIRMED: "契約済",
};

export default async function JobDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ return?: string }>;
}) {
    const { id } = await params;
    const { return: returnTo } = await searchParams;
    const supabase = await createClient();

    // Fetch Job Details
    const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select(`
            *, 
            clients(name),
            linked_contract: client_job_contracts!assigned_contract_id (
                *,
                clients(name)
            )
        `)
        .eq("id", id)
        .single();

    if (jobError || !job) {
        notFound();
    }

    // Fetch Applications for this Job
    const { data: dbApplications, error: appError } = await supabase
        .from("job_applications")
        .select("*, workers(*), reports(id, status)")
        .eq("job_id", id)
        .order("created_at", { ascending: false });

    // Fetch Placement Contracts (toB) for this Job
    const { data: dbPlacementContracts } = await supabase
        .from("client_job_contracts")
        .select("*, clients(name)")
        .eq("job_id", id)
        .eq("trading_type", "PLACING")
        .order("created_at", { ascending: false });

    const applications = dbApplications || [];
    const placementContracts = dbPlacementContracts ? [...dbPlacementContracts] : [];
    const linkedContract = (job as any).linked_contract;

    // Add linked contract to the list of placement contracts if it exists and is not already there
    if (linkedContract && !placementContracts.some((c: any) => c.id === linkedContract.id)) {
        placementContracts.push(linkedContract);
    }

    // Determine back link based on return parameter
    const backLink = returnTo === 'calendar' ? '/calendar' : '/jobs';
    const backLabel = returnTo === 'calendar' ? 'カレンダーに戻る' : '案件一覧に戻る';

    return (
        <AdminLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href={backLink}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        title={backLabel}
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <JobStatusSelect jobId={job.id} currentStatus={job.status} />
                            <span>ID: {job.id}</span>
                        </div>
                    </div>
                    <JobDetailActions jobId={job.id} />
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Left Column: Job Info */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-lg">案件詳細</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">クライアント</label>
                                    {/* @ts-ignore */}
                                    <div className="text-sm font-medium">{job.clients?.name}</div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">場所</label>
                                    <div className="flex items-start gap-2 text-sm mt-1">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                        <span>{job.address_text || "未設定"}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">日時</label>
                                    {job.is_flexible ? (
                                        <div className="flex items-center gap-2 text-sm mt-1">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>
                                                {formatDate(job.work_period_start)} 〜 {formatDate(job.work_period_end)}
                                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">期間指定</span>
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span>{formatDate(job.start_time)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm mt-1">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                <span>
                                                    {formatTime(job.start_time)} - {formatTime(job.end_time)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">報酬</label>
                                    <div className="flex items-center gap-2 text-sm mt-1 font-bold text-slate-900">
                                        <JapaneseYen className="w-4 h-4 text-slate-400" />
                                        ¥{Math.round(job.reward_amount).toLocaleString()}
                                        <span className="text-xs font-normal text-muted-foreground ml-1">
                                            (税込: ¥{Math.round(job.reward_amount * 1.1).toLocaleString()})
                                        </span>
                                    </div>
                                </div>

                                {job.billing_amount && (
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">請求金額</label>
                                        <div className="flex items-center gap-2 text-sm mt-1 font-bold text-slate-900">
                                            <Banknote className="w-4 h-4 text-slate-400" />
                                            ¥{Math.round(job.billing_amount).toLocaleString()}
                                            <span className="text-xs font-normal text-muted-foreground ml-1">
                                                (税込: ¥{Math.round(job.billing_amount * 1.1).toLocaleString()})
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">業務内容</label>
                                    <p className="text-sm mt-1 text-slate-600 whitespace-pre-wrap">
                                        {job.description || "詳細なし"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Applications & Placement Contracts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* @ts-ignore */}
                        <ApplicationList
                            // @ts-ignore
                            applications={applications || []}
                            // @ts-ignore
                            job={job}
                            placementCount={placementContracts.length}
                        />

                        {/* Placement Contracts (toB) */}
                        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        パートナーへの発注 ({placementContracts?.length || 0})
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        この案件に対するパートナーへの発注契約
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <LinkExistingContractButton
                                        jobId={id}
                                        currentContractId={(job as any).assigned_contract_id}
                                    />
                                    <Link
                                        href={`/clients/contracts/create?job_id=${id}&returnTo=/jobs/${id}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        パートナーに発注
                                    </Link>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-border text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">パートナー</th>
                                            <th className="px-6 py-3 font-medium text-right">契約金額</th>
                                            <th className="px-6 py-3 font-medium">ステータス</th>
                                            <th className="px-6 py-3 font-medium text-right">アクション</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {placementContracts && placementContracts.length > 0 ? (
                                            placementContracts.map((contract: any) => (
                                                <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Building2 className="w-4 h-4 text-slate-400" />
                                                            <span className="font-medium">{contract.clients?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-medium">
                                                        ¥{Math.round(parseFloat(contract.contract_amount || 0)).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                            contract.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                                'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            {contract.status === 'ACTIVE' ? '締結済' :
                                                                contract.status === 'CANCELLED' ? '取消' :
                                                                    contract.status === 'PENDING' ? '未締結 (申請中)' : '下書き'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Link
                                                            href={`/clients/contracts/individual/${contract.id}`}
                                                            className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            詳細
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                                    発注契約はありません
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
