"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function createJob(payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("jobs")
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/jobs");
        return { success: true, data };
    } catch (error) {
        console.error("Error creating job:", error);
        return { success: false, error };
    }
}

export async function updateJob(id: string, payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("jobs")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/jobs");
        revalidatePath(`/jobs/${id}`);
        return { success: true, data };
    } catch (error) {
        console.error("Error updating job:", error);
        return { success: false, error };
    }
}
