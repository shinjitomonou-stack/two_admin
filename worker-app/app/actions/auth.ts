"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createWorkerProfile(formData: FormData) {
    try {
        console.log("createWorkerProfile: Starting profile creation for", formData.get("email"));
        const name = formData.get("name") as string;
        const name_kana = formData.get("name_kana") as string;
        const line_name = formData.get("line_name") as string;
        const email = formData.get("email") as string;
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

        if (!name || !email || !name_kana || !phone || !address || !gender || !birth_date) {
            return { error: "必須項目が入力されていません" };
        }

        const supabase = await createClient();

        // Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error("createWorkerProfile: Authentication check failed:", userError);
            return { error: "認証情報の取得に失敗しました。再度ログインしてください。" };
        }

        if (user.email !== email) {
            console.error("createWorkerProfile: Email mismatch:", { sessionEmail: user.email, formEmail: email });
            return { error: "不正なリクエストです: メールアドレスが一致しません" };
        }

        console.log("createWorkerProfile: Checking existing profile (using anon key)");

        // Check if profile already exists
        const { data: existingProfile, error: checkError } = await supabase
            .from("workers")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

        if (checkError) {
            console.error("createWorkerProfile: Check existing profile failed:", checkError);
        }

        if (existingProfile) {
            console.log("createWorkerProfile: Profile already exists for user", user.id);
            return { success: true };
        }

        console.log("createWorkerProfile: Creating worker record in DB (using service role key)");
        const supabaseAdmin = await createAdminClient();
        const { error: workerError } = await supabaseAdmin
            .from("workers")
            .insert([
                {
                    id: user.id,
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
            console.error("createWorkerProfile: Worker record creation failed:", workerError);
            // Note: We don't delete the user here because they are already authenticated.
            // They can retry profile creation.
            return { error: "プロフィールの作成に失敗しました: " + workerError.message };
        }

        console.log("createWorkerProfile: Success, revalidating path");
        revalidatePath("/");
        return { success: true };
    } catch (err: any) {
        console.error("createWorkerProfile: Unexpected server exception:", err);
        return { error: "予期しないエラーが発生しました。(" + (err.message || "Unknown error") + ")" };
    }
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

    const redirectTo = (formData.get("redirectTo") as string) || "/";

    revalidatePath("/");
    redirect(redirectTo);
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://two-worker.vercel.app";
    const redirectTo = `${siteUrl}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
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
