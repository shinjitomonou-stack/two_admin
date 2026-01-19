"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function approvePaymentNotice(id: string) {
    const supabase = await createClient();

    // Auth check - ensure this notice belongs to the logged-in worker
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized" };

    try {
        const { data, error } = await supabase
            .from("payment_notices")
            .update({
                status: "APPROVED",
                approved_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("worker_id", user.id) // Security check
            .select()
            .single();

        if (error) throw error;

        revalidatePath(`/payments/${id}`);
        revalidatePath("/payments");
        return { success: true, data };
    } catch (error) {
        console.error("Error approving payment notice:", error);
        return { success: false, error };
    }
}
