"use client";

import { useState } from "react";
import { resetPasswordRequest } from "@/app/actions/auth";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        const result = await resetPasswordRequest(formData);

        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        } else if (result?.success) {
            setSuccess(true);
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">メールを送信しました</h2>
                            <p className="text-sm text-slate-600 mb-6">
                                パスワードリセット用のリンクをメールで送信しました。
                                <br />
                                メールをご確認ください。
                            </p>
                            <Link
                                href="/login"
                                className="inline-block text-primary hover:text-primary/90 font-medium hover:underline"
                            >
                                ログインページに戻る
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">パスワードリセット</h1>
                    <p className="text-slate-500 mt-2">登録したメールアドレスを入力してください</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        ログインに戻る
                    </Link>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" />
                                メールアドレス
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="admin@example.com"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                            <p className="text-xs text-slate-500">
                                パスワードリセット用のリンクを送信します
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    送信中...
                                </>
                            ) : (
                                "リセットメールを送信"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
