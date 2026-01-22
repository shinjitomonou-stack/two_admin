"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ScrollToTop() {
    const searchParams = useSearchParams();
    const isSigned = searchParams.get("signed") === "true";

    useEffect(() => {
        if (isSigned) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [isSigned]);

    return null;
}
