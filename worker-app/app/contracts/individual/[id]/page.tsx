import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import IndividualContractSigningForm from "../IndividualContractSigningForm";
import { CheckCircle, FileText } from "lucide-react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { logout } from "@/app/actions/auth";

export default async function IndividualContractPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();
    const workerId = user?.id;

    if (!workerId) {
        redirect(`/login?redirectTo=/contracts/individual/${id}`);
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
                <div className="text-center max-w-sm mx-auto">
                    <div className="mb-4">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">契約書が見つかりませんでした</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        アクセスしようとした契約書が存在しないか、閲覧権限がありません。
                    </p>

                    {user?.email && (
                        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 text-left">
                            <p className="text-xs text-slate-400 mb-1">現在のアカウント:</p>
                            <p className="font-medium text-slate-900 truncate">{user.email}</p>
                            <p className="text-xs text-slate-500 mt-2">
                                契約書の署名依頼が届いたメールアドレスと異なるアカウントでログインしている可能性があります。
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Link href="/" className="block w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">
                            ホームに戻る
                        </Link>
                        <form action={logout}>
                            <button className="block w-full bg-white text-red-600 font-bold py-3 rounded-xl border border-slate-200 hover:bg-red-50 transition-colors">
                                ログアウトして別のアカウントで試す
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    const isSigned = contract.status === "SIGNED";

    // Replace placeholders in template with actual job data
    let content = contract.contract_templates?.content_template || "";
    const job = contract.job_applications?.jobs; // Note: adjusted based on previous fix
    // Wait, in previous step I simplified the home page query, but here we are fetching differently.
    // The query above fetches job_applications as an object (single due to !inner logic usually, but here it's 1:1 if defined correctly)
    // However, Supabase returns array if relation is 1:many. job_individual_contracts -> job_applications is M:1 (contract belongs to application).
    // So it should be an object. Let's check the type safety.
    // Actually, contract.job_applications might be an array if not defined as single relation in client generator, 
    // but typically M:1 returns object.

    // Let's safe guard it to be sure, like I did in notification logic.
    const app = Array.isArray(contract.job_applications) ? contract.job_applications[0] : contract.job_applications;
    const jobData = app?.jobs;
    const client = jobData?.clients;

    if (jobData && client) {
        content = content
            .replace(/{{job_title}}/g, jobData.title)
            .replace(/{{client_name}}/g, client.name)
            .replace(/{{reward_amount}}/g, jobData.reward_amount.toLocaleString())
            .replace(/{{start_time}}/g, new Date(jobData.start_time).toLocaleString())
            .replace(/{{address}}/g, jobData.address_text || "未定");

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
                                <h2 key={i} className="text-lg font-bold mt-6 mb-2">{line.replace('# ', '')}</h2>;
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
