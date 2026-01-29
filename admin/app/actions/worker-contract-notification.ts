"use server";

import { createClient } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function sendWorkerContractNotification(contractId: string) {
    await verifyAdmin();
    console.log("Starting sendWorkerContractNotification for:", contractId);
    const supabase = await createClient();

    try {
        // 1. Get contract and worker info
        const { data: contract, error: contractError } = await supabase
            .from("job_individual_contracts")
            .select(`
                *,
                worker:workers!worker_id (full_name, line_id, line_user_id),
                job_applications!application_id (
                    jobs (title)
                ),
                linked_applications:job_applications!individual_contract_id (
                    jobs (title)
                )
            `)
            .eq("id", contractId)
            .single();

        if (contractError || !contract) {
            console.error("Contract error:", contractError);
            throw new Error("Contract not found");
        }

        // Handle array or object structure for relations
        // @ts-ignore
        const worker = Array.isArray(contract.worker) ? contract.worker[0] : contract.worker;

        if (!worker) throw new Error("No worker found");

        const appFromSource = Array.isArray(contract.job_applications) ? contract.job_applications[0] : contract.job_applications;
        // @ts-ignore
        const appFromLink = Array.isArray(contract.linked_applications) ? contract.linked_applications[0] : contract.linked_applications;

        const rawJob = appFromSource?.jobs || appFromLink?.jobs;
        const job = Array.isArray(rawJob) ? rawJob[0] : rawJob;
        const jobTitle = job?.title || "未設定";

        // @ts-ignore
        const lineUserId = worker.line_id || worker.line_user_id;

        if (!lineUserId) {
            return { success: false, message: "Worker has no LINE ID" };
        }

        // TODO: This should be an environment variable in the future
        const WORKER_APP_URL = process.env.WORKER_APP_URL || "https://support.teo-work.com";

        // 2. Send LINE message
        // Add ?openExternalBrowser=1 to force opening in external browser (Safari/Chrome)
        const contractUrl = `${WORKER_APP_URL}/contracts/individual/${contractId}?openExternalBrowser=1`;
        const message = `【契約書確認のお願い】\n\n${worker.full_name}様\n\n案件「${jobTitle}」に関する個別契約書が発行されました。\n\n以下のURLより内容をご確認の上、署名をお願いいたします。\n${contractUrl}`;

        const result = await sendLineMessage(lineUserId, message);

        if (!result.success) {
            console.error(`Failed to send LINE message:`, result.error);
            return { success: false, error: result.error };
        }

        // 3. Update notification status
        const { error: updateError } = await supabase
            .from("job_individual_contracts")
            .update({ notification_sent_at: new Date().toISOString() })
            .eq("id", contractId);

        if (updateError) {
            console.error("Failed to update status:", updateError);
        }

        revalidatePath(`/contracts/individual/${contractId}`);
        return { success: true };

    } catch (error: any) {
        console.error("Server Action Error:", error);
        return { success: false, error: error.message };
    }
}
