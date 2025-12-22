"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function createWorkerBasicContract(workerId: string, templateId: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("worker_basic_contracts")
            .insert({
                worker_id: workerId,
                template_id: templateId,
                status: "PENDING",
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/contracts");
        return { success: true, data };
    } catch (error) {
        console.error("Error creating individual contract:", error);
        return { success: false, error };
    }
}

export async function createJobIndividualContract(workerId: string, templateId: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("job_individual_contracts")
            .insert({
                worker_id: workerId,
                template_id: templateId,
                status: "PENDING",
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/contracts");
        return { success: true, data };
    } catch (error) {
        console.error("Error creating individual contract:", error);
        return { success: false, error };
    }
}
