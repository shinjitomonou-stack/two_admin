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

export async function bulkCreateWorkersAction(workersData: any[]) {
    await verifyAdmin();
    const supabaseAdmin = await createAdminClient();

    let successCount = 0;
    const errors: { row: number; email: string; message: string }[] = [];

    for (let i = 0; i < workersData.length; i++) {
        const row = workersData[i];
        try {
            // Basic validation
            if (!row.email || !row.full_name) {
                throw new Error("メールアドレスと氏名は必須です");
            }

            // 1. Create Auth User
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: row.email,
                email_confirm: true,
                user_metadata: { full_name: row.full_name },
                password: Math.random().toString(36).slice(-12),
            });

            if (authError) throw authError;

            // 2. Prepare DB payload
            const dbPayload: any = {
                id: authData.user.id,
                full_name: row.full_name,
                name_kana: row.name_kana || null,
                email: row.email,
                phone: row.phone || null,
                postal_code: row.postal_code || null,
                address: row.address || null,
                gender: (row.gender === "男性" || row.gender === "male") ? "male" :
                    (row.gender === "女性" || row.gender === "female") ? "female" : null,
                birth_date: row.birth_date || null,
                rank: row.rank || "Bronze",
                tags: row.tags ? String(row.tags).split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
                is_verified: true,
            };

            if (row.worker_number) {
                dbPayload.worker_number = row.worker_number;
            }

            // 3. Insert Worker Record
            const { error: dbError } = await supabaseAdmin
                .from("workers")
                .insert([dbPayload]);

            if (dbError) {
                // Rollback Auth
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                throw dbError;
            }

            successCount++;
        } catch (error: any) {
            console.error(`Error at row ${i + 1}:`, error);
            errors.push({
                row: i + 1,
                email: row.email || "不明",
                message: error.message || "予期せぬエラー"
            });
        }
    }

    revalidatePath("/workers");
    return {
        success: errors.length === 0,
        count: successCount,
        errors: errors.length > 0 ? errors : null
    };
}

export async function bulkUpdateWorkerBankAccounts(accountsData: any[]) {
    await verifyAdmin();
    const supabaseAdmin = await createAdminClient();

    let successCount = 0;
    const errors: { row: number; id: string; message: string }[] = [];

    for (let i = 0; i < accountsData.length; i++) {
        const row = accountsData[i];
        try {
            // Identifier: either id (UUID) or worker_number
            const id = row.id;
            const workerNumber = row.worker_number;

            if (!id && !workerNumber) {
                throw new Error("IDまたはワーカーID(W番号)が必要です");
            }

            // Construct bank_account JSON
            const bankAccount = {
                bank_name: row.bank_name,
                branch_name: row.branch_name,
                account_type: row.account_type, // "普通" or "当座" usually
                account_number: row.account_number,
                account_holder_name: row.account_holder_name,
                account_holder_name_kana: row.account_holder_name_kana,
            };

            // Find worker to update
            let query = supabaseAdmin.from("workers").update({ bank_account: bankAccount });

            if (id) {
                query = query.eq("id", id);
            } else if (workerNumber) {
                query = query.eq("worker_number", workerNumber);
            }

            const { data, error, count } = await query.select("id").single();

            if (error) {
                // If no rows updated (e.g. invalid code), it might return error or count 0 depending on driver
                // supabase-js single() throws if 0 rows found
                if (error.code === 'PGRST116') {
                    throw new Error(`対象のワーカーが見つかりません (ID: ${id || workerNumber})`);
                }
                throw error;
            }

            successCount++;
        } catch (error: any) {
            console.error(`Error at row ${i + 1}:`, error);
            errors.push({
                row: i + 1,
                id: row.id || row.worker_number || "不明",
                message: error.message || "予期せぬエラー"
            });
        }
    }

    revalidatePath("/workers");
    return {
        success: errors.length === 0,
        count: successCount,
        errors: errors.length > 0 ? errors : null
    };
}
