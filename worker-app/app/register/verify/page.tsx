"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { toast } from "sonner";
import { createWorkerProfile } from "../../actions/auth";

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get temp data from localStorage (saved during registration step)
    const getStoredFormData = () => {
        try {
            const stored = localStorage.getItem("worker_reg_data");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (!email) {
                throw new Error("メールアドレスが見つかりません。最初からやり直してください。");
            }

            const supabase = createClient();

            // 1. Verify OTP
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'signup'
            });

            if (verifyError) {
                console.error("Verification error:", verifyError);
                throw new Error("確認コードが正しくないか、有効期限が切れています。");
            }

            // 2. Create Profile in DB
            const formData = getStoredFormData();
            if (!formData || formData.email !== email) {
                throw new Error("登録セッションの有効期限が切れました。最初から登録をやり直してください。");
            }

            // Convert stored object back to FormData
            const submitData = new FormData();
            Object.keys(formData).forEach(key => {
                submitData.append(key, formData[key]);
            });

            const result = await createWorkerProfile(submitData);

            if (result.error) {
                throw new Error(result.error);
            }

            // Cleanup
            localStorage.removeItem("worker_reg_data");

            toast.success("登録が完了しました！");
            router.push("/");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!email) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <p className="text-red-500 mb-4">不正なアクセスです</p>
                <button
                    onClick={() => router.push("/register")}
                    className="text-blue-600 hover:underline"
                >
                    登録ページへ戻る
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold mb-2 text-center">メール確認</h1>
            <p className="text-sm text-gray-600 mb-6 text-center">
                {email} 宛に送信された確認コードを入力してください。
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
                <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                        確認コード
                    </label>
                    <input
                        id="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                        required
                    />
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || otp.length < 6}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? "確認中..." : "認証して完了"}
                </button>
            </form>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <VerifyContent />
            </Suspense>
        </div>
    );
}
