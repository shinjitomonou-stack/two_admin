"use client";

import { useState } from "react";
import { resetPasswordRequest } from "@/app/actions/auth";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
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
                                className="inline-block text-blue-600 hover:text-blue-700 font-medium hover:underline"
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        ログインに戻る
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">パスワードリセット</h1>
                    <p className="text-slate-600">登録したメールアドレスを入力してください</p>
                </div>

                {/* Reset Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                メールアドレス
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="example@email.com"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                            <p className="text-xs text-slate-500">
                                パスワードリセット用のリンクを送信します
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
