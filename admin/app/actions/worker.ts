"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function updateWorkerAction(id: string, payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Sanitize payload: convert empty strings to null
        const sanitizedPayload = Object.fromEntries(
            Object.entries(payload).map(([key, value]) => [
                key,
                value === "" ? null : value
            ])
        );

        const { data, error } = await supabase
            .from("workers")
            .update(sanitizedPayload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/workers");
        revalidatePath(`/workers/${id}`);
        return { success: true, data };
    } catch (error: any) {
        console.error("Error updating worker:", error);
        return {
            success: false,
            error: error.message || "更新に失敗しました。入力内容を確認してください。"
        };
    }
}

export async function createWorkerAction(payload: {
    full_name: string;
    name_kana?: string;
    email: string;
    phone?: string;
    tags?: string[];
}) {
    await verifyAdmin();
    const supabaseAdmin = await createAdminClient();

    try {
        // 1. Create Auth User using Admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: payload.email,
            email_confirm: true,
            user_metadata: { full_name: payload.full_name },
            password: Math.random().toString(36).slice(-12), // Placeholder password
        });

        if (authError) throw authError;

        // 2. Create Worker Record
        const { data, error } = await supabaseAdmin
            .from("workers")
            .insert([{
                id: authData.user.id,
                full_name: payload.full_name,
                name_kana: payload.name_kana || "",
                email: payload.email,
                phone: payload.phone || "",
                tags: payload.tags || [],
                is_verified: true, // Admin registered workers are verified by default? 
                // Alternatively, let the admin decide.
            }])
            .select()
            .single();

        if (error) {
            // Rollback Auth User if DB insert fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw error;
        }

        revalidatePath("/workers");
        return { success: true, data };
    } catch (error: any) {
        console.error("Error creating worker:", error);
        return { success: false, error: error.message || "登録に失敗しました" };
    }
}
