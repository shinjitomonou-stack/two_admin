import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import ContractSigningForm from "@/app/contracts/basic/ContractSigningForm";

export default async function BasicContractPage() {
    const supabase = await createClient();

    // Get authenticated user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const workerId = user.id;

    // Fetch the active Basic Contract Template
    const { data: template } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("type", "BASIC")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (!template) {
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold mb-4">契約書テンプレートが見つかりません</h1>
                <p>管理者にお問い合わせください。</p>
                <Link href="/" className="text-blue-600 mt-4 inline-block">トップへ戻る</Link>
            </div>
        );
    }

    // Check if already signed
    const { data: existingContract } = await supabase
        .from("worker_basic_contracts")
        .select("id, status")
        .eq("worker_id", workerId)
        .eq("template_id", template.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingContract && existingContract.status === 'SIGNED') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold mb-2">利用規約に同意済み</h1>
                    <p className="text-slate-500 mb-6">利用規約には既に同意されています。</p>
                    <Link href="/" className="block w-full bg-slate-900 text-white py-3 rounded-lg font-bold">トップページへ戻る</Link>
                </div>
            </div>
        );
    }

    let content = template.content_template || "";

    // Variable Replacement for Basic Contract (Terms)
    content = content
        .replace(/{{worker_name}}/g, user.user_metadata?.full_name || "（未設定）")
        .replace(/{{worker_address}}/g, user.user_metadata?.address || "（未設定）");

    // Date calculation for {{TODAY+n}}
    content = content.replace(/{{TODAY(\+(\d+))?}}/g, (match: string, p1: string, p2: string) => {
        const today = new Date();
        if (p2) {
            today.setDate(today.getDate() + parseInt(p2, 10));
        }
        return today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
                    <Link href="/" className="p-2 -ml-2 hover:bg-slate-50 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <h1 className="font-bold text-lg text-slate-900">利用規約の確認</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900">{template.title}</h2>
                        <p className="text-sm text-slate-500 mt-1">バージョン: {template.version}</p>
                    </div>

                    <div className="p-6 bg-slate-50/50 max-h-[60vh] overflow-y-auto prose prose-sm max-w-none">
                        {/* Simple markdown-like rendering */}
                        <div className="font-serif text-slate-700 leading-relaxed space-y-4">
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

                    <div className="p-6 border-t border-slate-100 bg-white">
                        <ContractSigningForm templateId={template.id} />
                    </div>
                </div>
            </div>
        </div>
    );
}
