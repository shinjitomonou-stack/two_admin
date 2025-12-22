"use server";

import { createClient } from "@/lib/supabase/server";
import { sendLineMessage } from "@/lib/line";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function sendContractNotification(contractId: string) {
    await verifyAdmin();
    console.log("Starting sendContractNotification for:", contractId);
    const supabase = await createClient();

    try {
        // 1. Get contract and job info
        const { data: contract, error: contractError } = await supabase
            .from("client_job_contracts")
            .select("*, jobs(title)")
            .eq("id", contractId)
            .single();

        if (contractError || !contract) {
            console.error("Contract error:", contractError);
            throw new Error("Contract not found");
        }

        const jobId = contract.job_id;
        const jobTitle = contract.jobs?.title || "未設定";

        // 2. Get assigned workers
        // Status checks: ASSIGNED or CONFIRMED
        const { data: applications, error: appError } = await supabase
            .from("job_applications")
            .select("worker_id, workers(id, full_name, line_id)")
            .eq("job_id", jobId)
            .in("status", ["ASSIGNED", "CONFIRMED"]);

        if (appError) {
            console.error("App error:", appError);
            throw new Error("Failed to fetch workers");
        }

        if (!applications || applications.length === 0) {
            return { success: false, message: "No assigned workers found" };
        }

        let sentCount = 0;

        // 3. Send LINE messages
        for (const app of applications) {
            // Handle potential array return from Supabase
            const rawWorker = app.workers;
            const worker = Array.isArray(rawWorker) ? rawWorker[0] : rawWorker;

            // @ts-ignore
            const lineUserId = (worker as any)?.line_id || (worker as any)?.line_user_id;

            if (lineUserId) {
                const message = `【契約書確認のお願い】\n\n${worker.full_name}様\n\n案件「${jobTitle}」に関する個別契約書が発行されました。\n\n管理画面より内容をご確認ください。`;

                const result = await sendLineMessage(lineUserId, message);
                if (result.success) {
                    sentCount++;
                } else {
                    console.error(`Failed to send to ${worker.full_name}:`, result.error);
                }
            } else {
                console.warn(`Worker ${worker.full_name} has no LINE ID`);
            }
        }

        // 4. Update notification status
        if (sentCount > 0) {
            const { error: updateError } = await supabase
                .from("client_job_contracts")
                .update({ notification_sent_at: new Date().toISOString() })
                .eq("id", contractId);

            if (updateError) {
                console.error("Failed to update status:", updateError);
            }
        }

        revalidatePath(`/clients/contracts/individual/${contractId}`);
        return { success: true, sentCount, total: applications.length };

    } catch (error: any) {
        console.error("Server Action Error:", error);
        return { success: false, error: error.message };
    }
}
