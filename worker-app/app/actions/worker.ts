"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateBankAccount(workerId: string, bankAccount: any) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("workers")
        .update({ bank_account: bankAccount })
        .eq("id", workerId);

    if (error) {
        console.error("Error updating bank account:", error);
        throw new Error("口座情報の更新に失敗しました");
    }

    revalidatePath("/");
    revalidatePath("/settings/bank");
    return { success: true };
}
