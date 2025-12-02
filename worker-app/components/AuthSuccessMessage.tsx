"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

export function AuthSuccessMessage() {
    const searchParams = useSearchParams();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (searchParams.get("auth_success") === "true") {
            setShow(true);
            // Auto-hide after 5 seconds
            const timer = setTimeout(() => setShow(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    if (!show) return null;

    return (
        <div className="max-w-md mx-auto px-4 mt-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-bold text-green-800 text-sm">認証が完了しました</h3>
                    <p className="text-xs text-green-700 mt-1 leading-relaxed">
                        メールアドレスの確認が完了し、ログインしました。
                    </p>
                </div>
            </div>
        </div>
    );
}
