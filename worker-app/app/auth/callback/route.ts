import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    console.log("Worker auth callback:", {
        hasCode: !!code,
        next,
        origin,
        allParams: Object.fromEntries(searchParams.entries())
    });

    if (code) {
        const supabase = await createClient();
        console.log("Worker auth callback: Attempting to exchange code for session");
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error("Worker auth callback: Exchange failed:", error);
        }

        if (!error) {
            console.log("Worker auth callback: Exchange successful, redirecting to:", next);
            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}?auth_success=true`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}?auth_success=true`);
            } else {
                return NextResponse.redirect(`${origin}${next}?auth_success=true`);
            }
        }
    }

    console.error("Worker auth callback: No code or exchange failed, redirecting to error page");
    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
