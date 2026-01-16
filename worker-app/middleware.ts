import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // [Safety Bridge] If an auth code hits the worker root path, it's likely a fallback from Supabase
    // because the 'Site URL' is set to this domain. Redirect it to the admin application.
    const hasAuthCode = request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("token_hash");
    if (hasAuthCode && request.nextUrl.pathname === "/") {
        const adminCallbackUrl = new URL("https://admin-liart-nine.vercel.app/auth/callback");
        request.nextUrl.searchParams.forEach((value, key) => {
            adminCallbackUrl.searchParams.set(key, value);
        });
        // Default to /update-password if no 'next' is present
        if (!adminCallbackUrl.searchParams.has("next")) {
            adminCallbackUrl.searchParams.set("next", "/update-password");
        }
        console.log("Worker Middleware: Redirecting auth code bridge to Admin App");
        return NextResponse.redirect(adminCallbackUrl);
    }

    // Refresh session if expired
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    // Protected routes - require authentication
    const protectedPaths = ["/profile", "/applications"];
    const isProtectedPath = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isProtectedPath && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // If user is logged in and tries to access login/register, redirect to home
    // Note: We allow access to /register/verify even if logged in, to complete the flow if needed
    if (user && (request.nextUrl.pathname === "/login" || (request.nextUrl.pathname === "/register" && !request.nextUrl.pathname.startsWith("/register/verify")))) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
