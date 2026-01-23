import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
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
export async function createAdminClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            const newOptions = { ...options };
                            if (process.env.NEXT_PUBLIC_SITE_URL?.includes('teo-work.com')) {
                                newOptions.domain = '.teo-work.com';
                                newOptions.path = '/';
                            }
                            cookieStore.set(name, value, newOptions);
                        });
                    } catch {
                        // Ignore
                    }
                },
            },
        }
    )
}
