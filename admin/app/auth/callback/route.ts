import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const token_hash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type") || "recovery";
    const next = requestUrl.searchParams.get("next") ?? "/";

    console.log(`Auth callback: code=${!!code}, token_hash=${!!token_hash}, type=${type}, next=${next}`);

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Handle server action cookies
                    }
                },
            },
        }
    );

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
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
            return NextResponse.redirect(new URL(next, request.url));
        }
        console.error("Verify OTP error:", error);
        return NextResponse.redirect(new URL(`/login?error=auth-callback-failed&message=${encodeURIComponent(error.message)}`, request.url));
    }

    console.warn("Auth callback: No code or token_hash found");
    return NextResponse.redirect(new URL("/login?error=no-auth-code", request.url));
}
