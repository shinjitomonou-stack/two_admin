"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function registerWorker(formData: FormData) {
    const name = formData.get("name") as string;
    const name_kana = formData.get("name_kana") as string;
    const line_name = formData.get("line_name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const postal_code = formData.get("postal_code") as string;
    const address = formData.get("address") as string;
    const gender = formData.get("gender") as string;

    // Handle date construction
    const birth_year = formData.get("birth_year") as string;
    const birth_month = formData.get("birth_month") as string;
    const birth_day = formData.get("birth_day") as string;
    let birth_date = null;
    if (birth_year && birth_month && birth_day) {
        birth_date = `${birth_year}-${birth_month.padStart(2, '0')}-${birth_day.padStart(2, '0')}`;
    }

    if (!name || !email || !password || !name_kana || !phone || !address || !gender || !birth_date) {
        return { error: "必須項目が入力されていません" };
    }

    if (password.length < 8) {
        return { error: "パスワードは8文字以上で入力してください" };
    }

    const supabase = await createClient();

    // Check if email already exists
    const { data: existingUser } = await supabase
        .from("workers")
        .select("id")
        .eq("email", email)
        .single();

    if (existingUser) {
        return { error: "このメールアドレスは既に登録されています" };
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            },
        },
    });

    if (authError) {
        console.error("Auth signup error:", authError);
        return { error: "登録に失敗しました: " + authError.message };
    }

    if (!authData.user) {
        return { error: "ユーザーの作成に失敗しました" };
    }

    // Create worker record with the same ID as auth user
    const { error: workerError } = await supabase
        .from("workers")
        .insert([
            {
                id: authData.user.id, // Use auth user ID
                full_name: name,
                name_kana: name_kana,
                line_name: line_name,
                email: email,
                phone: phone,
                postal_code: postal_code,
                address: address,
                gender: gender,
                birth_date: birth_date,
                rank: "Bronze",
            },
        ]);

    if (workerError) {
        console.error("Worker creation error:", workerError);
        // Cleanup: delete auth user if worker creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { error: "登録に失敗しました: " + workerError.message };
    }

    revalidatePath("/");
    return { success: true };
}

export async function loginWorker(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "メールアドレスとパスワードを入力してください" };
    }

    const supabase = await createClient();

    const { data: worker } = await supabase
        .from("workers")
        .select("id, password_hash")
        .eq("email", email)
        .single();

    if (!worker || worker.password_hash !== password) {
        return { error: "メールアドレスまたはパスワードが間違っています" };
    }

    // Set cookie
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("worker_id", worker.id, { httpOnly: true, path: "/" });

    redirect("/");
}

// ===== Supabase Auth Functions =====

export async function loginWithEmail(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "メールアドレスとパスワードを入力してください" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login error:", error);
        return { error: "メールアドレスまたはパスワードが間違っています" };
    }

    // Check if worker exists in workers table
    const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("id", data.user.id)
        .single();

    if (!worker) {
        // User exists in auth but not in workers table
        await supabase.auth.signOut();
        return { error: "ワーカー情報が見つかりません" };
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
        return { error: "パスワードの更新に失敗しました" };
    }

    revalidatePath("/");
    redirect("/login?password_updated=true");
}
