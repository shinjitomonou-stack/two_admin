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

    // 1. [Safety Net] Handle auth code redirection before anything else
    const hasAuthCode = request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("token_hash");
    if (hasAuthCode && request.nextUrl.pathname !== "/auth/callback") {
        const callbackUrl = new URL("/auth/callback", request.url);
        request.nextUrl.searchParams.forEach((value, key) => {
            callbackUrl.searchParams.set(key, value);
        });
        if (!callbackUrl.searchParams.has("next") && request.nextUrl.searchParams.get("type") === "recovery") {
            callbackUrl.searchParams.set("next", "/update-password");
        }
        console.log(`Middleware: Redirecting auth code from ${request.nextUrl.pathname} to /auth/callback`);
        return NextResponse.redirect(callbackUrl);
    }

    // 2. Public paths check
    const publicPaths = ["/login", "/forgot-password", "/update-password", "/auth/callback"];
    const isPublicPath = publicPaths.includes(request.nextUrl.pathname);

    // 3. Skip session refresh for public pages - especially /auth/callback to avoid PKCE interference
    if (isPublicPath) {
        if (request.nextUrl.pathname === "/auth/callback") {
            const verifier = request.cookies.get("sb-mfxwslhcnpzujobobnxj-auth-token-code-verifier");
            console.log(`Middleware: Entering callback route. PKCE verifier present: ${!!verifier}`);
        }
        return response;
    }

    // 4. Refresh session for protected routes
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 5. Protected routes logic
    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // 6. Check if user is an admin
    // We need to use a Service Role client or ensure RLS allows reading own record
    // Using the authenticated client is safer as it respects RLS.
    // We assume RLS is set up so users can read their own record in admin_users.
    const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!adminUser) {
        console.warn(`Middleware: Unauthorized access attempt by user ${user.id} (${user.email})`);
        // Basic sign out is handled by client-side usually, but we force redirect to login
        // We can also clear the cookie manually if needed, but redirecting with error is a good start.
        const url = new URL("/login", request.url);
        url.searchParams.set("error", "unauthorized");

        // Optionally sign out the user by clearing cookies in the response
        // But for now, just redirecting prevents access.
        return NextResponse.redirect(url);
    }

    // If logged in and on a public page (but we already handled public pages above, 
    // this part only runs if we didn't return 'response' in step 3. 
    // Since Step 3 handles ALL public paths, this part is technically unreachable 
    // for non-authenticated public paths.)

    return response;

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
