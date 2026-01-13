"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function bulkUpdateWorkerBankAccounts(accountsData: any[]) {
    await verifyAdmin();
    const supabaseAdmin = await createAdminClient();

    let successCount = 0;
    const errors: { row: number; id: string; message: string }[] = [];

    for (let i = 0; i < accountsData.length; i++) {
        const row = accountsData[i];
        try {
            // Identifier: either id (UUID) or worker_number
            // Identifier: either id (UUID), worker_number, or email
            const id = row.id;
            const workerNumber = row.worker_number;
            const email = row.email;

            if (!id && !workerNumber && !email) {
                throw new Error("ID、ワーカーID、またはメールアドレスが必要です");
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
            // Strategy: Resolve target worker UUID first using ID, then Email, then Worker Number
            let targetWorkerId: string | null = null;
            const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

            // 1. Try ID as UUID
            if (id && isUuid(id)) {
                const { data } = await supabaseAdmin.from("workers").select("id").eq("id", id).single();
                if (data) targetWorkerId = data.id;
            }

            // 2. Try Email
            if (!targetWorkerId && email) {
                const { data } = await supabaseAdmin.from("workers").select("id").eq("email", email).single();
                if (data) targetWorkerId = data.id;
            }

            // 3. Try Worker Number
            if (!targetWorkerId && workerNumber) {
                const { data } = await supabaseAdmin.from("workers").select("id").eq("worker_number", workerNumber).single();
                if (data) targetWorkerId = data.id;
            }

            if (!targetWorkerId) {
                throw new Error(`対象のワーカーが見つかりません。ID: ${id || "-"} / メール: ${email || "-"} / ワーカーID: ${workerNumber || "-"}`);
            }

            const { error } = await supabaseAdmin
                .from("workers")
                .update({ bank_account: bankAccount })
                .eq("id", targetWorkerId);

            if (error) {
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
