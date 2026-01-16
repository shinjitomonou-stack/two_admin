"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "メールアドレスとパスワードを入力してください" };
    }

    const supabase = await createClient();

    // 1. Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError || !authData.user) {
        console.error("Admin login error:", authError);
        return { error: "メールアドレスまたはパスワードが間違っています" };
    }

    // 2. Check if user exists in admin_users table
    const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("id, role")
        .eq("id", authData.user.id)
        .single();

    if (adminError || !adminUser) {
        // User is authenticated but not an admin
        await supabase.auth.signOut();
        return { error: "管理者権限がありません" };
    }

    revalidatePath("/");
    redirect("/");
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();

    revalidatePath("/");
    redirect("/login");
}

export async function resetPasswordRequest(formData: FormData) {
    const email = formData.get("email") as string;

    if (!email) {
        return { error: "メールアドレスを入力してください" };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`,
    });

    if (error) {
        console.error("Password reset error:", error);
        return { error: "パスワードリセットメールの送信に失敗しました" };
    }

    return { success: true };
}

export async function updatePassword(formData: FormData) {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || !confirmPassword) {
        return { error: "パスワードを入力してください" };
    }

    if (password !== confirmPassword) {
        return { error: "パスワードが一致しません" };
    }

    if (password.length < 8) {
        return { error: "パスワードは8文字以上で入力してください" };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
        password: password,
    });

    if (error) {
        console.error("Password update error:", error);
        return { error: "パスワードの更新に失敗しました: " + error.message };
    }

    revalidatePath("/");
    redirect("/login?password_updated=true");
}
