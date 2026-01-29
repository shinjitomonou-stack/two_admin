import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, FileSignature, ShieldCheck, Clock, Globe, Hash } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import StatusChanger from "@/components/StatusChanger";
import DownloadContractPDFButton from "@/components/contracts/DownloadContractPDFButton";

export default async function SignedContractDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const id = params.id;
    const supabase = await createClient();

    const { data: contract, error } = await supabase
        .from("worker_basic_contracts")
        .select("*, workers(full_name, email, address), contract_templates(title, version)")
        .eq("id", id)
        .single();

    // Fetch company settings for replacement
    const { data: company } = await supabase
        .from("company_settings")
        .select("*")
        .single();

    if (error || !contract) {
        notFound();
    }

    // @ts-ignore
    const worker = contract.workers;

    // --- Variable Replacement for Display (for legacy data) ---
    function replaceVariables(text: string) {
        if (!text) return "";
        let result = text;

        if (worker) {
            result = result
                .replace(/{{worker_name}}/g, worker.full_name || "")
                .replace(/{{worker_address}}/g, worker.address || "");
        }
        if (company) {
            result = result
                .replace(/{{company_name}}/g, company.name || "")
                .replace(/{{company_address}}/g, company.address || "")
                .replace(/{{company_rep}}/g, company.representative_name || "");
        }

        // Date Variables (using signed_at if available, else today)
        const baseDate = contract.signed_at ? new Date(contract.signed_at) : new Date();
        result = result.replace(/{{TODAY(\+(\d+))?}}/g, (match: string, p1: string, p2: string) => {
            const date = new Date(baseDate);
            if (p2) {
                date.setDate(date.getDate() + parseInt(p2, 10));
            }
            return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
        });

        return result;
    }

    const displayContent = replaceVariables(contract.signed_content_snapshot || "");


    return (
        <AdminLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/contracts/basic"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors print:hidden"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold tracking-tight">契約書詳細・証跡</h2>
                        <p className="text-muted-foreground text-xs font-mono">ID: {contract.id}</p>
                    </div>
                    <div className="print:hidden">
                        <DownloadContractPDFButton />
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3 print:block print:space-y-6">
                    {/* Main Content: The Contract Text */}
                    <div className="lg:col-span-2 space-y-6 print:w-full">
                        <div className="bg-white p-8 rounded-xl border border-border shadow-sm print:shadow-none print:border-none print:p-0">
                            {/* PDF Formal Title (Only visible in print) */}
                            <div className="hidden print:block text-center mb-12">
                                <h1 className="text-3xl font-bold tracking-widest underline underline-offset-8">
                                    {contract.contract_templates?.title || "基本契約書"}
                                </h1>
                            </div>

                            <div className="flex items-center justify-between border-b border-border pb-4 mb-6 print:hidden">
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

                            <div className="prose prose-sm max-w-none prose-slate print:prose-base print:text-black">
                                <div className="whitespace-pre-wrap font-serif leading-relaxed p-4 bg-slate-50 rounded border border-slate-100 print:bg-white print:border-none print:p-0">
                                    {displayContent}
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-border">
                                <div className="flex justify-between items-end">
                                    <div className="relative">
                                        <p className="text-sm font-bold mb-1">乙（受託者）</p>
                                        {/* @ts-ignore */}
                                        <p className="text-lg font-bold">{contract.workers?.full_name} 殿</p>
                                        {/* @ts-ignore */}
                                        <p className="text-sm text-muted-foreground print:hidden">{contract.workers?.email}</p>

                                        {contract.status === 'SIGNED' && (
                                            <div className="absolute -top-12 -right-24 h-24 w-24 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500 font-serif transform -rotate-12 select-none pointer-events-none opacity-80 print:opacity-100 print:border-red-600 print:text-red-600">
                                                <div className="text-center">
                                                    <span className="block text-xs font-bold">電子署名済</span>
                                                    <span className="block text-xs mt-1 font-bold">{formatDate(contract.signed_at)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Audit Log */}
                    <div className="space-y-6 print:break-before-page print:mt-12">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6 print:shadow-none print:border print:border-slate-200">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-green-600" />
                                監査ログ・証跡
                            </h3>

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

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> 同意ハッシュ値
                                    </label>
                                    <div className="text-xs font-mono bg-slate-50 p-2 rounded border border-slate-100 break-all text-slate-500">
                                        {contract.consent_hash || "Not generated"}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    この記録は、ユーザーが本契約に同意した際のシステムログです。
                                    法的紛争時の証拠として使用される可能性があります。
                                </p>
                            </div>
                        </div>

                        {/* Status Changer */}
                        <div className="print:hidden">
                            <StatusChanger
                                contractId={id}
                                currentStatus={contract.status}
                                contractType="worker_basic_contracts"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
