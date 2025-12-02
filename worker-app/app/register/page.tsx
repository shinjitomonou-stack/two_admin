"use client";

import { useState } from "react";
import { registerWorker } from "@/app/actions/auth";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        const result = await registerWorker(formData);
        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        } else if (result?.success) {
            setIsSuccess(true);
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">登録を受け付けました</h1>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        ご登録いただいたメールアドレスに確認メールを送信しました。<br />
                        メール内のリンクをクリックして、登録を完了してください。
                    </p>
                    <Link
                        href="/login"
                        className="block w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        ログインページへ戻る
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 border-b pb-4 mb-4">【テオワーク】登録フォーム</h1>
                    <p className="text-slate-500 text-xs text-left">
                        スタッフ登録用のフォームになっております。
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg">
                        {error}
                    </div>
                )}

                <form action={handleSubmit} className="space-y-6">
                    {/* ... existing form fields ... */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">名前(フルネーム)</label>
                        <input
                            name="name"
                            type="text"
                            required
                            placeholder="山田 太郎"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">名前(カナ) <span className="text-red-500">*</span></label>
                        <input
                            name="name_kana"
                            type="text"
                            required
                            placeholder="ヤマダ タロウ"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">LINEの名前 <span className="text-red-500">*</span></label>
                        <input
                            name="line_name"
                            type="text"
                            required
                            placeholder="Taro Yamada"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">郵便番号 <span className="text-red-500">*</span></label>
                            <input
                                name="postal_code"
                                type="text"
                                required
                                placeholder="123-4567"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">住所 <span className="text-red-500">*</span></label>
                            <input
                                name="address"
                                type="text"
                                required
                                placeholder="東京都..."
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">電話番号 <span className="text-red-500">*</span></label>
                            <input
                                name="phone"
                                type="tel"
                                required
                                placeholder="090-1234-5678"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">メールアドレス <span className="text-red-500">*</span></label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="taro@example.com"
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">性別 <span className="text-red-500">*</span></label>
                        <div className="flex items-center gap-6 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="gender" value="male" className="w-4 h-4 text-slate-900 focus:ring-slate-900" required />
                                <span className="text-sm">男性</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="gender" value="female" className="w-4 h-4 text-slate-900 focus:ring-slate-900" />
                                <span className="text-sm">女性</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">生年月日 <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <input
                                name="birth_year"
                                type="number"
                                placeholder="2000"
                                required
                                className="w-24 px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <span className="self-center">年</span>
                            <input
                                name="birth_month"
                                type="number"
                                placeholder="1"
                                min="1"
                                max="12"
                                required
                                className="w-16 px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <span className="self-center">月</span>
                            <input
                                name="birth_day"
                                type="number"
                                placeholder="1"
                                min="1"
                                max="31"
                                required
                                className="w-16 px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <span className="self-center">日</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">パスワード <span className="text-red-500">*</span></label>
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="8文字以上"
                            minLength={8}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2 mt-8"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                送信
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500">
                        すでにアカウントをお持ちの方は
                        <Link href="/login" className="text-blue-600 font-medium hover:underline ml-1">
                            ログイン
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
