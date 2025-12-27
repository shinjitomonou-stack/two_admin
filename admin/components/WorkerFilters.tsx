"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchInput from "./ui/SearchInput";
import { X } from "lucide-react";

const RANKS = ["Bronze", "Silver", "Gold", "Platinum"];

export default function WorkerFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const clearFilters = () => {
        const params = new URLSearchParams();
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const hasFilters = searchParams.has("query");

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
                <SearchInput
                    placeholder="名前、メールアドレス、タグで検索..."
                    className="flex-1 max-w-sm"
                />

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
