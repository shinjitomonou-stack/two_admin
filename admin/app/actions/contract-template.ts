"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function deleteContractTemplate(id: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from("contract_templates")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/contracts/templates");
        return { success: true };
    } catch (error) {
        console.error("Error deleting contract template:", error);
        return { success: false, error };
    }
}

export async function duplicateContractTemplate(id: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // 1. Get original template
        const { data: original, error: fetchError } = await supabase
            .from("contract_templates")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !original) throw fetchError || new Error("Template not found");

        // 2. Prepare data for duplication
        const { id: _, created_at: __, updated_at: ___, ...rest } = original;
        const duplicatedData = {
            ...rest,
            title: `${original.title} (コピー)`,
            is_active: false // Duplicated template starts as inactive
        };

        // 3. Insert new template
        const { data: duplicated, error: insertError } = await supabase
            .from("contract_templates")
            .insert(duplicatedData)
            .select()
            .single();

        if (insertError) throw insertError;

        revalidatePath("/contracts/templates");
        return { success: true, data: duplicated };
    } catch (error) {
        console.error("Error duplicating contract template:", error);
        return { success: false, error };
    }
}
