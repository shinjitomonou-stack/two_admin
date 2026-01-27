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
        router.push(fallbackHref);
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
