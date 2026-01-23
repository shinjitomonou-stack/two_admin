import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        console.error("createClient: Missing environment variables!", { hasUrl: !!url, hasKey: !!key });
    }

    return createServerClient(
        url!,
        key!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            // Enable cross-subdomain cookies for teo-work.com
                            const newOptions = { ...options };
                            if (process.env.NEXT_PUBLIC_SITE_URL?.includes('teo-work.com')) {
                                newOptions.domain = '.teo-work.com';
                                newOptions.path = '/';
                            }
                            cookieStore.set(name, value, newOptions);
                        });
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

// Admin client with Service Role Key for admin operations
// We use the standard createClient to avoid any cookie interference for admin operations
export async function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        console.error("createAdminClient: Missing environment variables!", { hasUrl: !!url, hasKey: !!key });
        throw new Error("Missing Supabase Admin environment variables");
    }

    console.log("createAdminClient: Initializing admin client", {
        url,
        keyPrefix: key.substring(0, 10),
        keyLength: key.length
    });

    return createSupabaseClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
