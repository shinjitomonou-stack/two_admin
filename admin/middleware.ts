import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
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
                    // The original logic was setting cookies on the request and then on the response.
                    // To ensure cookies are correctly set for the response, we should only set them on the response object.
                    // The `response` object is created outside this `setAll` function, so we need to ensure it's the one being modified.
                    // The `createServerClient` expects `setAll` to modify the response object that will be returned.
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protected routes logic
    const publicPaths = ["/login", "/forgot-password", "/update-password", "/auth/callback"];
    const isPublicPath = publicPaths.includes(request.nextUrl.pathname);

    // [Safety Net] If the URL contains an auth code but we are not on the callback route,
    // redirect to /auth/callback to process the login.
    // This handles cases where Supabase redirects to the root due to misconfiguration.
    const hasAuthCode = request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("token_hash");
    if (hasAuthCode && request.nextUrl.pathname !== "/auth/callback") {
        const callbackUrl = new URL("/auth/callback", request.url);
        // Copy all search params
        request.nextUrl.searchParams.forEach((value, key) => {
            callbackUrl.searchParams.set(key, value);
        });
        // If 'next' is not present, default to /update-password for recovery type
        if (!callbackUrl.searchParams.has("next") && request.nextUrl.searchParams.get("type") === "recovery") {
            callbackUrl.searchParams.set("next", "/update-password");
        }
        console.log("Middleware: Auth code detected on non-callback path. Redirecting to /auth/callback");
        return NextResponse.redirect(callbackUrl);
    }

    // If not logged in and not on a public page, redirect to login
    if (!user && !isPublicPath) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If logged in and on a public page, redirect to dashboard
    // Exception: Allow access to /update-password even if logged in (for forgot password flow)
    if (user && isPublicPath && request.nextUrl.pathname !== "/update-password") {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api (API routes)
         * - public files (svg, png, etc)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
