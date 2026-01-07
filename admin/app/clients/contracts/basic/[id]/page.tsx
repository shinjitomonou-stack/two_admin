import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Download, FileText, Calendar, Building2, User, DollarSign, Edit } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import StatusChanger from "@/components/StatusChanger";

export default async function ClientContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: contract, error } = await supabase
        .from("client_contracts")
        .select(`
            *,
            clients(name, email),
            contract_templates(title, version)
        `)
        .eq("id", id)
        .single();

    if (error || !contract) {
        notFound();
    }

    const getStatusBadge = (status: string) => {
        const styles = {
            DRAFT: "bg-slate-100 text-slate-700",
            PENDING: "bg-orange-100 text-orange-700",
            ACTIVE: "bg-green-100 text-green-700",
            EXPIRED: "bg-red-100 text-red-700",
            TERMINATED: "bg-red-100 text-red-700",
        };
        const labels = {
            DRAFT: "下書き",
            PENDING: "未締結 (申請中)",
            ACTIVE: "締結済",
            EXPIRED: "期限切れ",
            TERMINATED: "解約",
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
                {labels[status as keyof typeof labels]}
            </span>
        );
    };

    const billingCycleLabels = {
        MONTHLY: "月次",
        QUARTERLY: "四半期",
        YEARLY: "年次",
    };

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/clients/contracts"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold tracking-tight">{contract.title}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${contract.trading_type === 'RECEIVING' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                {contract.trading_type === 'RECEIVING' ? '受注' : '発注'}
                            </span>
                            <p className="text-muted-foreground text-sm">
                                {contract.contract_type === 'BASIC' ? '基本契約' : 'NDA（秘密保持契約）'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(contract.status)}
                        <Link
                            href={`/clients/contracts/basic/${contract.id}/edit`}
                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors text-xs font-medium"
                        >
                            <Edit className="w-3 h-3" />
                            編集
                        </Link>
                    </div>
                </div>

                {/* Contract Info */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-muted-foreground mb-1">クライアント</div>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    {/* @ts-ignore */}
                                    <span className="font-medium">{contract.clients?.name}</span>
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-muted-foreground mb-1">有効期間</div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">
                                        {formatDate(contract.start_date)} 〜 {contract.end_date ? formatDate(contract.end_date) : '無期限'}
                                    </span>
                                </div>
                                {contract.auto_renew && (
                                    <p className="text-xs text-green-600 mt-1">自動更新あり</p>
                                )}
                            </div>

                            {contract.monthly_amount && (
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">月額金額</div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium text-lg">
                                            ¥{contract.monthly_amount.toLocaleString()}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            / {billingCycleLabels[contract.billing_cycle as keyof typeof billingCycleLabels]}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {contract.signed_at && (
                                <>
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">締結日</div>
                                        <div className="font-medium">{formatDate(contract.signed_at)}</div>
                                    </div>

                                    {contract.signer_name && (
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">締結者</div>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium">{contract.signer_name}</span>
                                                {contract.signer_title && (
                                                    <span className="text-sm text-muted-foreground">({contract.signer_title})</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* @ts-ignore */}
                            {contract.contract_templates && (
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">使用テンプレート</div>
                                    <div className="font-medium">
                                        {/* @ts-ignore */}
                                        {contract.contract_templates.title} (v{contract.contract_templates.version})
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Changer */}
                <StatusChanger
                    contractId={id}
                    currentStatus={contract.status}
                    contractType="client_contracts"
                />

                {/* Uploaded Files */}
                {contract.uploaded_files && contract.uploaded_files.length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <h3 className="font-bold text-lg mb-4">アップロードされた契約書</h3>
                        <div className="space-y-2">
                            {contract.uploaded_files.map((file: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(file.uploaded_at)}
                                        </span>
                                    </div>
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                    >
                                        <Download className="w-4 h-4" />
                                        ダウンロード
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contract Content */}
                {contract.content_snapshot && (
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <h3 className="font-bold text-lg mb-4">契約内容</h3>
                        <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{contract.content_snapshot}</pre>
                        </div>
                    </div>
                )}

                {/* Audit Log */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                    <h3 className="font-bold text-lg mb-4">監査ログ</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">作成日時</span>
                            <span className="font-medium">{formatDate(contract.created_at)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">最終更新日時</span>
                            <span className="font-medium">{formatDate(contract.updated_at)}</span>
                        </div>
                        {contract.ip_address && (
                            <div className="flex justify-between py-2">
                                <span className="text-muted-foreground">締結時IPアドレス</span>
                                <span className="font-mono text-xs">{contract.ip_address}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
