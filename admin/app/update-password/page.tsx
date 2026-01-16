"use client";

import { useState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { Loader2, Lock, CheckCircle, ShieldCheck } from "lucide-react";

export default function UpdatePasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        const result = await updatePassword(formData);

        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
        // 成功時はサーバーアクション内でログイン画面にリダイレクトされます
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <ShieldCheck className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">新しいパスワード設定</h1>
                    <p className="text-slate-500 mt-2">新しいパスワードを入力してください</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-slate-400" />
                                新しいパスワード
                            </label>
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                placeholder="8文字以上"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-slate-400" />
                                パスワード確認
                            </label>
                            <input
                                name="confirmPassword"
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                placeholder="もう一度入力"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                            />
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                            <p className="text-xs text-slate-500">
                                セキュリティのため、8文字以上の英数字を推奨します。
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
