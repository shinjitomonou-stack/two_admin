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

export async function approveIndividualContract(contractId: string) {
    await verifyAdmin();
    const supabase = await createClient();

    // Get authenticated admin info
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Get client info for audit log
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    try {
        const { error } = await supabase
            .from("job_individual_contracts")
            .update({
                party_a_signed_at: new Date().toISOString(),
                party_a_signer_id: user.id,
                party_a_ip_address: ip,
                party_a_user_agent: userAgent
            })
            .eq("id", contractId);

        if (error) throw error;

        revalidatePath(`/contracts/individual/${contractId}`);
        return { success: true };
    } catch (error) {
        console.error("Error approving contract:", error);
        return { success: false, error };
    }
}
