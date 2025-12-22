"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function updateWorkerAction(id: string, payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("workers")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/workers");
        revalidatePath(`/workers/${id}`);
        return { success: true, data };
    } catch (error) {
        console.error("Error updating worker:", error);
        return { success: false, error };
    }
}
