import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <h1 className="font-bold text-lg text-slate-900">作業報告</h1>
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 py-6">
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                    <p className="text-slate-500 mb-4">作業報告ページは準備中です</p>
                    <Link
                        href="/"
                        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        ホームに戻る
                    </Link>
                </div>
            </main>
        </div>
    );
}
