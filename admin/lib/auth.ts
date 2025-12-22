import { createClient } from "@/lib/supabase/server";

export async function isAdmin() {
    try {
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData?.user) {
            console.log("Auth check in isAdmin: No active session or error", authError);
            return false;
        }

        const { data: adminUser, error: dbError } = await supabase
            .from("admin_users")
            .select("id")
            .eq("id", authData.user.id)
            .single();

        if (dbError || !adminUser) {
            console.log("DB check in isAdmin: User not found in admin_users or DB error", dbError);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Critical failure in isAdmin:", error);
        return false;
    }
}

export async function verifyAdmin() {
    if (!await isAdmin()) {
        throw new Error("管理者権限が必要です");
    }
}
