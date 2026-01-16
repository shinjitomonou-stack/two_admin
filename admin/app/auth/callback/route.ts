import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const token_hash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type") || "recovery";
    const next = requestUrl.searchParams.get("next") ?? "/";

    console.log(`Auth callback: code=${!!code}, token_hash=${!!token_hash}, type=${type}, next=${next}`);

    // Log all sb- cookies for debugging
    const cookieHeader = request.headers.get("cookie");
    const sbCookies = cookieHeader?.split(';').filter(c => c.trim().startsWith('sb-'));
    console.log("Auth callback cookies (sb-*):", sbCookies);

    const supabase = await createClient();

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            console.log("Auth session exchanged successfully. Redirecting to:", next);
            return NextResponse.redirect(new URL(next, request.url));
        }
        console.error("Exchange code error:", error);
        return NextResponse.redirect(new URL(`/login?error=auth-callback-failed&message=${encodeURIComponent(error.message)}`, request.url));
    }

    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
        });
        if (!error) {
            console.log("OTP verified successfully. Redirecting to:", next);
            return NextResponse.redirect(new URL(next, request.url));
        }
        console.error("Verify OTP error:", error);
        return NextResponse.redirect(new URL(`/login?error=auth-callback-failed&message=${encodeURIComponent(error.message)}`, request.url));
    }

    console.warn("Auth callback: No code or token_hash found");
    return NextResponse.redirect(new URL("/login?error=no-auth-code", request.url));
}
