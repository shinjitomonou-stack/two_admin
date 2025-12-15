"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
    value: string;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
}

export function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = "選択してください",
    searchPlaceholder = "検索...",
    className,
    disabled = false,
    required = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Get selected option details
    const selectedOption = options.find((opt) => opt.value === value);

    // Filter options based on search query
    const filteredOptions = options.filter(
        (opt) =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (opt.subLabel && opt.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setSearchQuery("");
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-md border border-input bg-background text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isOpen ? "ring-2 ring-primary/50 border-primary" : "",
                    disabled ? "opacity-50 cursor-not-allowed bg-slate-100" : "hover:border-slate-400"
                )}
            >
                {selectedOption ? (
                    <div className="flex flex-col items-start leading-tight">
                        <span className="font-medium text-slate-900">{selectedOption.label}</span>
                        {selectedOption.subLabel && (
                            <span className="text-xs text-muted-foreground">{selectedOption.subLabel}</span>
                        )}
                    </div>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )}

                <div className="flex items-center gap-1">
                    {value && !disabled && (
                        <div
                            role="button"
                            onClick={handleClear}
                            className="p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </div>
                    )}
                    <ChevronsUpDown className="w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* Hidden Required Input for Form Validation */}
            {required && (
                <input
                    type="text"
                    required
                    value={value}
                    onChange={() => { }}
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none -z-10"
                    tabIndex={-1}
                />
            )}

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-border bg-slate-50 sticky top-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-8 pr-3 py-1.5 text-sm rounded bg-white border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                見つかりませんでした
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        "flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer transition-colors",
                                        option.value === value
                                            ? "bg-primary/10 text-primary-dark font-medium"
                                            : "hover:bg-slate-100 text-slate-700"
                                    )}
                                >
                                    <div className="flex flex-col">
                                        <span>{option.label}</span>
                                        {option.subLabel && (
                                            <span className="text-xs text-muted-foreground">{option.subLabel}</span>
                                        )}
                                    </div>
                                    {option.value === value && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
