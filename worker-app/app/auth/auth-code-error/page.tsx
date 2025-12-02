import Link from "next/link";

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg
                        className="w-8 h-8 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-4">
                    認証エラー
                </h1>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    メール認証に失敗しました。<br />
                    リンクの有効期限が切れているか、既に使用済みの可能性があります。
                </p>
                <Link
                    href="/login"
                    className="block w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors"
                >
                    ログインページへ
                </Link>
            </div>
        </div>
    );
}
