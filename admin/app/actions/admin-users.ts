"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "認証が必要です" };
    }

    const { data: currentAdmin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!currentAdmin) {
        return { error: "管理者権限がありません" };
    }

    // Check if email already exists
    const { data: existingAdmin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", email)
        .single();

    if (existingAdmin) {
        return { error: "このメールアドレスは既に登録されています" };
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for admin users
    });

    if (authError) {
        console.error("Auth user creation error:", authError);
        return { error: "ユーザーの作成に失敗しました: " + authError.message };
    }

    if (!authData.user) {
        return { error: "ユーザーの作成に失敗しました" };
    }

    // Create admin_users record
    const { error: adminError } = await supabase
        .from("admin_users")
        .insert([
            {
                id: authData.user.id,
                email: email,
            },
        ]);

    if (adminError) {
        console.error("Admin user creation error:", adminError);
        // Cleanup: delete auth user if admin_users creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { error: "管理者の登録に失敗しました: " + adminError.message };
    }

    revalidatePath("/settings/admins");
    redirect("/settings/admins");
}

export async function deleteAdminUser(userId: string) {
    const supabase = await createClient();

    // Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "認証が必要です" };
    }

    // Prevent self-deletion
    if (user.id === userId) {
        return { error: "自分自身を削除することはできません" };
    }

    const { data: currentAdmin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .single();

    if (!currentAdmin) {
        return { error: "管理者権限がありません" };
    }

    // Delete from admin_users table
    const { error: deleteError } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", userId);

    if (deleteError) {
        console.error("Admin deletion error:", deleteError);
        return { error: "削除に失敗しました: " + deleteError.message };
    }

    // Delete from Supabase Auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
        console.error("Auth user deletion error:", authDeleteError);
        // Note: admin_users record is already deleted, but auth user remains
        return { error: "認証ユーザーの削除に失敗しました" };
    }

    revalidatePath("/settings/admins");
    return { success: true };
}
