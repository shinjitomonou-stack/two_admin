"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;
            const name = formData.get("name") as string;

            if (!email || !password || !name) {
                throw new Error("必須項目を入力してください");
            }

            // 1. Client-side SignUp
            const supabase = createClient();
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                    emailRedirectTo: undefined, // No link, using OTP
                },
            });

            if (signUpError) {
                if (signUpError.message.includes("already registered")) {
                    throw new Error("このメールアドレスは既に登録されています");
                }
                throw new Error("登録に失敗しました: " + signUpError.message);
            }

            // 2. Save form data to localStorage for the next step (profile creation)
            const formObj: Record<string, string> = {};
            formData.forEach((value, key) => {
                formObj[key] = value as string;
            });
            localStorage.setItem("worker_reg_data", JSON.stringify(formObj));

            // 3. Redirect to Verify Page
            router.push(`/register/verify?email=${encodeURIComponent(email)}`);

        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message || "予期しないエラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

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
                                次へ
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
