"use server";

import { createClient } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line";
import { revalidatePath } from "next/cache";

export async function sendWorkerContractNotification(contractId: string) {
    console.log("Starting sendWorkerContractNotification for:", contractId);
    const supabase = await createClient();

    try {
        // 1. Get contract and worker info
        const { data: contract, error: contractError } = await supabase
            .from("job_individual_contracts")
            .select(`
                *,
                job_applications (
                    workers (full_name, line_id, line_user_id),
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
        const app = Array.isArray(contract.job_applications) ? contract.job_applications[0] : contract.job_applications;
        if (!app) throw new Error("No job application found");

        const worker = Array.isArray(app.workers) ? app.workers[0] : app.workers;
        if (!worker) throw new Error("No worker found");

        const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
        const jobTitle = job?.title || "未設定";

        // @ts-ignore
        const lineUserId = worker.line_id || worker.line_user_id;

        if (!lineUserId) {
            return { success: false, message: "Worker has no LINE ID" };
        }

        // TODO: This should be an environment variable in the future
        const WORKER_APP_URL = process.env.WORKER_APP_URL || "https://two-admin.vercel.app";

        // 2. Send LINE message
        const contractUrl = `${WORKER_APP_URL}/contracts/individual/${contractId}`;
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
