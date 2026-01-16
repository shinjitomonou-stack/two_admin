"use client";

import { useState, Suspense, useEffect } from "react";
import { login } from "@/app/actions/auth";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const isPasswordUpdated = searchParams.get("password_updated") === "true";

    // Check for auth callback errors
    useEffect(() => {
        const authError = searchParams.get("error");
        const authMessage = searchParams.get("message");
        if (authError) {
            setError(`認証エラー: ${authMessage || "認証の処理に失敗しました"}`);
        }
    }, [searchParams]);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        const result = await login(formData);

        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">管理画面ログイン</h1>
                    <p className="text-slate-500 mt-2">管理者アカウントでログインしてください</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    {isPasswordUpdated && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <span>パスワードを更新しました。新しいパスワードでログインしてください。</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">メールアドレス</label>
                            <input
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="admin@example.com"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">パスワード</label>
                            <input
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    ログイン中...
                                </>
                            ) : (
                                "ログイン"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            href="/forgot-password"
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            パスワードをお忘れですか？
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
