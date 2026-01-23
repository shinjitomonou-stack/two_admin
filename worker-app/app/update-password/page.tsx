"use client";

import { useState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { Loader2, Lock, CheckCircle } from "lucide-react";

export default function UpdatePasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<{ message: string; details?: string } | null>(null);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        const result = await updatePassword(formData);

        if (result?.error) {
            setError({ message: result.error });
            setIsLoading(false);
        }
        // If success, server action redirects to login
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">新しいパスワード設定</h1>
                    <p className="text-slate-600">新しいパスワードを入力してください</p>
                </div>

                {/* Update Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                            <p className="font-bold mb-1">{error.message}</p>
                            {error.details && (
                                <details className="mt-2 text-xs opacity-70">
                                    <summary className="cursor-pointer hover:underline">技術的な詳細</summary>
                                    <p className="mt-1 font-mono break-all">{error.details}</p>
                                </details>
                            )}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                新しいパスワード
                            </label>
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                placeholder="8文字以上"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                パスワード確認
                            </label>
                            <input
                                name="confirmPassword"
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                placeholder="もう一度入力"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800">
                                パスワードは8文字以上で設定してください
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
                                    更新中...
                                </>
                            ) : (
                                "パスワードを更新"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
