import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with Service Role Key.
 * For use in Cron jobs and other server-side contexts without cookies.
 */
export function createServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}
