"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchInput from "./ui/SearchInput";
import { X } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "下書き",
    PENDING: "承認待ち",
    ACTIVE: "有効",
    EXPIRED: "期限切れ",
    TERMINATED: "解約",
    COMPLETED: "完了",
    CANCELLED: "キャンセル",
};

const TRADING_TYPE_LABELS: Record<string, string> = {
    RECEIVING: "受注",
    PLACING: "発注",
};

export default function ClientContractFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentStatus = searchParams.get("status") || "";
    const currentTradingType = searchParams.get("trading_type") || "";

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams();
        const tab = searchParams.get("tab");
        if (tab) params.set("tab", tab);
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const hasFilters = searchParams.has("search") || searchParams.has("status") || searchParams.has("trading_type");

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
                <SearchInput
                    placeholder="契約タイトルで検索..."
                    className="flex-1 max-w-sm"
                    paramName="search"
                />

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">受発注:</span>
                    <select
                        value={currentTradingType}
                        onChange={(e) => handleFilterChange("trading_type", e.target.value)}
                        className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <option value="">すべて</option>
                        {Object.entries(TRADING_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">ステータス:</span>
                    <select
                        value={currentStatus}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                        className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <option value="">すべて</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
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
