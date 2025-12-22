"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function createClientAction(payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("clients")
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/clients");
        return { success: true, data };
    } catch (error) {
        console.error("Error creating client:", error);
        return { success: false, error };
    }
}

export async function updateClientAction(id: string, payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("clients")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/clients");
        revalidatePath(`/clients/${id}`);
        return { success: true, data };
    } catch (error) {
        console.error("Error updating client:", error);
        return { success: false, error };
    }
}
