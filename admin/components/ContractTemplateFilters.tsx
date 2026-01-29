"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchInput from "./ui/SearchInput";
import { X } from "lucide-react";

export default function ContractTemplateFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentStatus = searchParams.get("status") || "";
    const currentType = searchParams.get("type") || "";

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
        router.push(`?${params.toString()}`);
    };

    const hasFilters = searchParams.has("query") || searchParams.has("status") || searchParams.has("type");

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
                <SearchInput
                    placeholder="テンプレート名で検索..."
                    className="flex-1 max-w-sm"
                />

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">ステータス:</span>
                    <select
                        value={currentStatus}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                        className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <option value="">すべて</option>
                        <option value="true">有効</option>
                        <option value="false">無効</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">種別:</span>
                    <select
                        value={currentType}
                        onChange={(e) => handleFilterChange("type", e.target.value)}
                        className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <option value="">すべて</option>
                        <option value="BASIC">基本契約</option>
                        <option value="INDIVIDUAL">個別契約</option>
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
