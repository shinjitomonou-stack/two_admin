import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LineConnectButton } from "@/components/LineConnectButton";
import BackButton from "@/components/BackButton";

export default async function LineSettingsPage() {
    const supabase = await createClient();

    // Get authenticated user from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const workerId = user.id;

    const { data: worker } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single();

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
                    <BackButton fallbackHref="/" />
                    <h1 className="font-bold text-lg text-slate-900">LINE連携設定</h1>
                </div>
            </header>

            <div className="max-w-md mx-auto px-4 py-6 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        {worker?.line_id ? (
                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <h2 className="font-bold text-slate-900 mb-1">
                                {worker?.line_id ? 'LINE連携済み' : 'LINE未連携'}
                            </h2>
                            <p className="text-sm text-slate-600">
                                {worker?.line_id
                                    ? 'LINEアカウントと連携されています。案件の採用通知などがLINEで届きます。'
                                    : 'LINEアカウントと連携すると、案件の採用通知などがLINEで届くようになります。'
                                }
                            </p>
                        </div>
                    </div>

                    {!worker?.line_id && <LineConnectButton />}

                    {worker?.line_id && (
                        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                            <div className="font-medium mb-1">連携済みLINE ID</div>
                            <div className="font-mono text-xs">{worker.line_id}</div>
                        </div>
                    )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                    <div className="font-medium mb-2">📱 通知について</div>
                    <ul className="space-y-1 text-blue-800">
                        <li>• 案件への応募が採用された時</li>
                        <li>• 重要なお知らせがある時</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
