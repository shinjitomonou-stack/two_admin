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

            // Basic validation for ID format to prevent DB errors (e.g. "87" is not UUID)
            const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

            if (id && isUuid(id)) {
                query = query.eq("id", id);
            } else if (workerNumber) {
                query = query.eq("worker_number", workerNumber);
            } else {
                throw new Error(`有効なID(UUID)またはワーカーID(W番号)が必要です。値: ${id || "なし"} / ${workerNumber || "なし"}`);
            }

            const { data, error, count } = await query.select("id").single();

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
