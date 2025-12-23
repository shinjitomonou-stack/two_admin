"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

interface SearchInputProps {
    placeholder?: string;
    paramName?: string;
    className?: string;
}

export default function SearchInput({
    placeholder = "検索...",
    paramName = "query",
    className = "",
}: SearchInputProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [value, setValue] = useState(searchParams.get(paramName) || "");

    useEffect(() => {
        const currentParam = searchParams.get(paramName) || "";
        if (value === currentParam) return;

        const timeout = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(paramName, value);
            } else {
                params.delete(paramName);
            }
            params.set("page", "1"); // Reset to first page on search

            startTransition(() => {
                router.push(`?${params.toString()}`);
            });
        }, 500);

        return () => clearTimeout(timeout);
    }, [value, paramName, router, searchParams]);

    const handleClear = () => {
        setValue("");
    };

    return (
        <div className={`relative ${className}`}>
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isPending ? "text-blue-500" : "text-muted-foreground"}`} />
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-9 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {value && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
            )}
        </div>
    );
}
