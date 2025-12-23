"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchInput from "./ui/SearchInput";
import { X } from "lucide-react";

export default function ContractFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentStatus = searchParams.get("status") || "";
    const currentTab = searchParams.get("tab") || "basic";

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (status) {
            params.set("status", status);
        } else {
            params.delete("status");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams();
        params.set("tab", currentTab);
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const hasFilters = searchParams.has("query") || searchParams.has("status");

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
                <SearchInput
                    placeholder={currentTab === 'basic' ? "ワーカー名、メールアドレスで検索..." : "ワーカー名、案件名で検索..."}
                    className="flex-1 max-w-sm"
                />

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">ステータス:</span>
                    <select
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <option value="">すべて</option>
                        <option value="SIGNED">締結済み</option>
                        <option value="PENDING">未締結 (依頼中)</option>
                        <option value="REJECTED">却下</option>
                    </select>
                </div>

                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <X className="w-4 h-4" />
                        クリア
                    </button>
                )}
            </div>
        </div>
    );
}
