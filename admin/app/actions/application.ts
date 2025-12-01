"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateApplicationStatus(applicationId: string, newStatus: 'ASSIGNED' | 'REJECTED') {
    const supabase = await createClient();

    try {
        // Get application details including worker and job info
        const { data: application } = await supabase
            .from("job_applications")
            .select(`
                *,
                workers(full_name, line_user_id),
                jobs(title, start_time, address_text)
            `)
            .eq("id", applicationId)
            .single();

        const { error } = await supabase
            .from("job_applications")
            .update({ status: newStatus })
            .eq("id", applicationId);

        if (error) throw error;

        // Send LINE notification if worker is assigned and has LINE connected
        if (newStatus === 'ASSIGNED' && application?.workers?.line_user_id) {
            const { sendLineMessage } = await import("@/lib/line");
            const job = application.jobs;
            const worker = application.workers;

            const message = `【採用通知】\n\n${worker.full_name}さん\n\n案件「${job.title}」に採用されました！\n\n日時: ${new Date(job.start_time).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n場所: ${job.address_text || '未設定'}\n\n詳細はアプリでご確認ください。`;

            await sendLineMessage(worker.line_user_id, message);
        }

        revalidatePath("/jobs/[id]", "page");
        return { success: true };
    } catch (error) {
        console.error("Error updating application status:", error);
        return { success: false, error };
    }
}

export async function updateApplicationSchedule(
    applicationId: string,
    scheduledStart: string | null,
    scheduledEnd: string | null
) {
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from("job_applications")
            .update({
                scheduled_work_start: scheduledStart,
                scheduled_work_end: scheduledEnd,
            })
            .eq("id", applicationId);

        if (error) throw error;

        revalidatePath("/jobs/[id]", "page");
        return { success: true };
    } catch (error) {
        console.error("Error updating application schedule:", error);
        return { success: false, error };
    }
}
