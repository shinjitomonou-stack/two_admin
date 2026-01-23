"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

interface JobFiltersProps {
    onFilterChange: (filters: FilterState) => void;
    clients: Array<{ id: string; name: string }>;
}

export interface FilterState {
    search: string;
    status: string[];
    clientId: string;
    dateFrom: string;
    dateTo: string;
}

const STATUS_OPTIONS = [
    { value: "OPEN", label: "募集中" },
    { value: "FILLED", label: "満員" },
    { value: "IN_PROGRESS", label: "実施待ち" },
    { value: "COMPLETED", label: "完了" },
    { value: "CANCELLED", label: "中止" },
    { value: "DRAFT", label: "下書き" },
];

export function JobFilters({ onFilterChange, clients }: JobFiltersProps) {
    const [filters, setFilters] = useState<FilterState>({
        search: "",
        status: [],
        clientId: "",
        dateFrom: "",
        dateTo: "",
    });

    const [showFilters, setShowFilters] = useState(false);

    const updateFilters = (updates: Partial<FilterState>) => {
        const newFilters = { ...filters, ...updates };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const resetFilters = () => {
        const emptyFilters: FilterState = {
            search: "",
            status: [],
            clientId: "",
            dateFrom: "",
            dateTo: "",
        };
        setFilters(emptyFilters);
        onFilterChange(emptyFilters);
    };

    const toggleStatus = (status: string) => {
        const newStatus = filters.status.includes(status)
            ? filters.status.filter((s) => s !== status)
            : [...filters.status, status];
        updateFilters({ status: newStatus });
    };

    const hasActiveFilters =
        filters.search ||
        filters.status.length > 0 ||
        filters.clientId ||
        filters.dateFrom ||
        filters.dateTo;

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="案件名、クライアント名、住所で検索..."
                        value={filters.search}
                        onChange={(e) => updateFilters({ search: e.target.value })}
                        className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium transition-colors ${showFilters || hasActiveFilters
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-input hover:bg-slate-50"
                        }`}
                >
                    フィルター
                    {hasActiveFilters && (
                        <span className="bg-white text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                            {[
                                filters.status.length > 0,
                                filters.clientId,
                                filters.dateFrom || filters.dateTo,
                            ].filter(Boolean).length}
                        </span>
                    )}
                </button>
                {hasActiveFilters && (
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                        <X className="w-4 h-4" />
                        クリア
                    </button>
                )}
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            ステータス
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => toggleStatus(option.value)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filters.status.includes(option.value)
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Client Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            クライアント
                        </label>
                        <select
                            value={filters.clientId}
                            onChange={(e) => updateFilters({ clientId: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            <option value="">すべて</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            作業予定日
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">開始日</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">終了日</label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => updateFilters({ dateTo: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
