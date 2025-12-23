"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchInput from "./ui/SearchInput";
import { X } from "lucide-react";

const RANKS = ["Bronze", "Silver", "Gold", "Platinum"];

export default function WorkerFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentRank = searchParams.get("rank") || "";

    const handleRankChange = (rank: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (rank) {
            params.set("rank", rank);
        } else {
            params.delete("rank");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams();
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const hasFilters = searchParams.has("query") || searchParams.has("rank");

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
                <SearchInput
                    placeholder="名前、メールアドレスで検索..."
                    className="flex-1 max-w-sm"
                />

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">ランク:</span>
                    <select
                        value={currentRank}
                        onChange={(e) => handleRankChange(e.target.value)}
                        className="text-sm border border-input rounded-md bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <option value="">すべて</option>
                        {RANKS.map(rank => (
                            <option key={rank} value={rank}>{rank}</option>
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
