import { createClient } from "@/lib/supabase/server";

export async function isAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: adminUser } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .single();

    return !!adminUser;
}

export async function verifyAdmin() {
    if (!await isAdmin()) {
        throw new Error("管理者権限が必要です");
    }
}
