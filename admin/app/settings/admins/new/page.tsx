"use client";

import { useState } from "react";
import { createAdminUser } from "@/app/actions/admin-users";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, Loader2, Shield } from "lucide-react";

export default function NewAdminPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        const result = await createAdminUser(formData);
        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
        // On success, will redirect to /settings/admins
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/settings/admins"
                        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        管理者一覧に戻る
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">新規管理者追加</h1>
                    <p className="text-slate-500 mt-2">
                        新しい管理者アカウントを作成します。
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                メールアドレス
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="admin@example.com"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all"
                            />
                            <p className="text-xs text-slate-500">
                                このメールアドレスでログインします
                            </p>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                パスワード
                            </label>
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                placeholder="8文字以上"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all"
                            />
                            <p className="text-xs text-slate-500">
                                8文字以上で設定してください
                            </p>
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                ロール
                            </label>
                            <select
                                name="role"
                                required
                                defaultValue="ADMIN"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all bg-white"
                            >
                                <option value="SYSTEM">システム管理者</option>
                                <option value="ADMIN">管理者</option>
                                <option value="USER">ユーザー</option>
                            </select>
                            <p className="text-xs text-slate-500">
                                管理者の権限範囲を設定します
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        作成中...
                                    </>
                                ) : (
                                    "管理者を作成"
                                )}
                            </button>
                            <Link
                                href="/settings/admins"
                                className="px-6 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                キャンセル
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                    <div className="font-medium mb-2">📝 注意事項</div>
                    <ul className="space-y-1 text-blue-800">
                        <li>• 作成された管理者は即座にログイン可能になります</li>
                        <li>• メール認証は自動的に完了します</li>
                        <li>• 管理者は全ての機能にアクセスできます</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
