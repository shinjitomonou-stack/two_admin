"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function createAdminUser(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "メールアドレスとパスワードを入力してください" };
    }

    if (password.length < 8) {
        return { error: "パスワードは8文字以上で入力してください" };
    }

    const supabase = await createClient();

    await verifyAdmin();

    // Check if email already exists
    const { data: existingAdmin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", email)
        .single();

    if (existingAdmin) {
        return { error: "このメールアドレスは既に登録されています" };
    }

    // Use admin client for creating/checking users
    const adminClient = await createAdminClient();

    // 1. Try to find existing Auth user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = users.find(u => u.email === email);

    let userId: string;

    if (existingAuthUser) {
        // User already exists in Auth
        userId = existingAuthUser.id;
        console.log("Existing Auth user found:", userId);
    } else {
        // 2. Create user with Supabase Auth if not exists
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            console.error("Auth user creation error:", authError);
            return { error: "ユーザーの作成に失敗しました: " + authError.message };
        }
        if (!authData.user) {
            return { error: "ユーザーの作成に失敗しました" };
        }
        userId = authData.user.id;
    }

    // 3. Create admin_users record (or check if already exists - though we checked above)
    const { error: adminError } = await adminClient
        .from("admin_users")
        .insert([
            {
                id: userId,
                email: email,
            },
        ]);

    if (adminError) {
        console.error("Admin user creation error:", adminError);
        // Only cleanup if we JUST created the user
        if (!existingAuthUser) {
            await adminClient.auth.admin.deleteUser(userId);
        }
        return { error: "管理者の登録に失敗しました: " + adminError.message };
    }

    revalidatePath("/settings/admins");
    redirect("/settings/admins");
}

export async function deleteAdminUser(userId: string) {
    const supabase = await createClient();

    await verifyAdmin();

    // Get current user for self-deletion check
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client for deleting from admin_users table to bypass RLS
    const adminClient = await createAdminClient();

    // Delete from admin_users table
    const { error: deleteError } = await adminClient
        .from("admin_users")
        .delete()
        .eq("id", userId);

    if (deleteError) {
        console.error("Admin deletion error:", deleteError);
        return { error: "削除に失敗しました: " + deleteError.message };
    }

    // Delete from Supabase Auth
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
        console.error("Auth user deletion error:", authDeleteError);
        // Note: admin_users record is already deleted, but auth user remains
        return { error: "認証ユーザーの削除に失敗しました" };
    }

    revalidatePath("/settings/admins");
    return { success: true };
}
