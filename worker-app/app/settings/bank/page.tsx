import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BankAccountForm } from "@/components/BankAccountForm";

export default async function BankAccountPage() {
    const supabase = await createClient();

    // Get authenticated user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const workerId = user.id;

    // Fetch existing bank account info
    const { data: worker } = await supabase
        .from("workers")
        .select("bank_account")
        .eq("id", workerId)
        .single();

    const initialData = worker?.bank_account ? {
        bankName: worker.bank_account.bank_name,
        branchName: worker.bank_account.branch_name,
        accountType: worker.bank_account.account_type,
        accountNumber: worker.bank_account.account_number,
        accountHolder: worker.bank_account.account_holder_name,
    } : undefined;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-4">
                    <Link href="/" className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <h1 className="font-bold text-lg">口座情報登録</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                        <Building2 className="w-5 h-5" />
                        <p className="text-sm">報酬の振込先口座を登録してください。</p>
                    </div>

                    <BankAccountForm workerId={workerId} initialData={initialData} />
                </div>
            </main>
        </div>
    );
}
