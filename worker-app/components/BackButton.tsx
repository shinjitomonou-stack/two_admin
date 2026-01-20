"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
    fallbackHref?: string;
    className?: string;
    variant?: "arrow" | "chevron";
    label?: string;
}

export default function BackButton({
    fallbackHref = "/",
    className,
    variant = "arrow",
    label
}: BackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        // Basic check to see if we have history within the app
        // In a real production app, you might use a more robust logic
        // but for simple cases, router.back() is usually preferred by users.
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push(fallbackHref);
        }
    };

    const Icon = variant === "arrow" ? ArrowLeft : ChevronLeft;

    return (
        <button
            onClick={handleBack}
            className={cn(
                "flex items-center gap-2 p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors text-slate-500",
                className
            )}
            aria-label="戻る"
        >
            <Icon className="w-5 h-5" />
            {label && <span className="text-sm font-medium">{label}</span>}
        </button>
    );
}
