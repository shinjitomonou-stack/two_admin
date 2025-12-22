"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function updateReportStatusAction(id: string, status: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("reports")
            .update({ status })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/reports");
        revalidatePath(`/reports/${id}`);
        return { success: true, data };
    } catch (error) {
        console.error("Error updating report status:", error);
        return { success: false, error };
    }
}

export async function updateReportAction(id: string, payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("reports")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/reports");
        revalidatePath(`/reports/${id}`);
        return { success: true, data };
    } catch (error) {
        console.error("Error updating report:", error);
        return { success: false, error };
    }
}
