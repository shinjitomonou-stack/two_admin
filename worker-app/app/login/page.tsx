"use client";

import { useState, Suspense, useEffect } from "react";
import { loginWithEmail } from "@/app/actions/auth";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirectTo");

    // Sync URL errors to local state
    useEffect(() => {
        const urlError = searchParams.get("error");
        const urlMessage = searchParams.get("message");
        if (urlError) {
            if (urlError === "auth-callback-failed") {
                setError(urlMessage || "認証に失敗しました。リンクの期限が切れているか、既に使用されている可能性があります。");
            } else if (urlError === "no-auth-code") {
                setError("認証コードが見つかりません。");
            } else {
                setError(urlMessage || "エラーが発生しました。");
            }
        }
    }, [searchParams]);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        const result = await loginWithEmail(formData);
        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">ログイン</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        登録したメールアドレスとパスワードを入力してください
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg">
                        {error}
                    </div>
                )}

                <form action={handleSubmit} className="space-y-6">
                    {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">メールアドレス</label>
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="taro@example.com"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">パスワード</label>
                        <input
                            name="password"
                            type="password"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        <div className="text-right">
                            <Link href="/reset-password" className="text-xs text-blue-600 hover:underline">
                                パスワードを忘れた場合
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                ログイン
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500">
                        アカウントをお持ちでない方は
                        <Link href="/register" className="text-blue-600 font-medium hover:underline ml-1">
                            新規登録
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
            <LoginContent />
        </Suspense>
    );
}
