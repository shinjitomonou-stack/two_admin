import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import IndividualContractSigningForm from "../IndividualContractSigningForm";
import { CheckCircle, FileText } from "lucide-react";
import Link from "next/link";
import BackButton from "@/components/BackButton";

export default async function IndividualContractPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    const workerId = user?.id;

    if (!workerId) {
        redirect("/login");
    }

    // Fetch the contract request
    const { data: contract, error } = await supabase
        .from("job_individual_contracts")
        .select(`
            *,
            contract_templates (
                title,
                content_template,
                version
            ),
            job_applications (
                jobs (
                    title,
                    reward_amount,
                    start_time,
                    end_time,
                    address_text,
                    clients (name, address)
                )
            )
        `)
        .eq("id", id)
        .single();

    if (error || !contract) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-slate-500 mb-4">契約書が見つかりませんでした。</p>
                    <Link href="/" className="text-blue-600 font-bold">ホームに戻る</Link>
                </div>
            </div>
        );
    }

    const isSigned = contract.status === "SIGNED";

    // Replace placeholders in template with actual job data
    // Note: In a real app, use a proper template engine. Here we do simple replacement.
    let content = contract.contract_templates?.content_template || "";
    const job = contract.job_applications?.jobs;
    const client = job?.clients;

    if (job && client) {
        content = content
            .replace(/{{job_title}}/g, job.title)
            .replace(/{{client_name}}/g, client.name)
            .replace(/{{reward_amount}}/g, job.reward_amount.toLocaleString())
            .replace(/{{start_time}}/g, new Date(job.start_time).toLocaleString())
            .replace(/{{address}}/g, job.address_text || "未定");

        // Date calculation for {{TODAY+n}}
        content = content.replace(/{{TODAY(\+(\d+))?}}/g, (match: string, p1: string, p2: string) => {
            const today = new Date();
            if (p2) {
                today.setDate(today.getDate() + parseInt(p2, 10));
            }
            return today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
        });
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
                    <BackButton fallbackHref="/" />
                    <h1 className="font-bold text-lg text-slate-900">個別契約の確認</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                {/* Status Banner */}
                {isSigned ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                            <h2 className="font-bold text-green-800">締結済みです</h2>
                            <p className="text-xs text-green-700 mt-0.5">
                                {new Date(contract.signed_at).toLocaleString()} に署名しました
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h2 className="font-bold text-blue-800 mb-1">内容をご確認ください</h2>
                        <p className="text-xs text-blue-700">
                            以下の契約内容を確認し、同意の上で署名を行ってください。
                        </p>
                    </div>
                )}

                {/* Contract Content */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-sm text-slate-700">
                            {contract.contract_templates?.title}
                        </span>
                        <span className="text-xs text-slate-400 ml-auto">
                            Ver. {contract.contract_templates?.version}
                        </span>
                    </div>
                    <div className="p-6 font-serif text-slate-700 leading-relaxed space-y-4">
                        {content.replace(/\\n/g, '\n').split('\n').map((line: string, i: number) => {
                            if (line.startsWith('# ')) {
                                return <h2 key={i} className="text-lg font-bold mt-6 mb-2">{line.replace('# ', '')}</h2>;
                            }
                            if (line.trim() === '') {
                                return <br key={i} />;
                            }
                            return <p key={i}>{line}</p>;
                        })}
                    </div>
                </div>

                {/* Signing Form */}
                {!isSigned && (
                    <IndividualContractSigningForm contractId={contract.id} />
                )}
            </main>
        </div>
    );
}
