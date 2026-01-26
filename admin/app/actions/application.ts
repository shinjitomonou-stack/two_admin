"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function updateApplicationStatus(applicationId: string, newStatus: 'ASSIGNED' | 'REJECTED' | 'CANCELLED') {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Get application details including worker and job info
        const { data: application } = await supabase
            .from("job_applications")
            .select(`
                *,
                workers(full_name, line_user_id),
                jobs(title, start_time, end_time, address_text, auto_set_schedule, is_flexible)
            `)
            .eq("id", applicationId)
            .single();

        const job = application?.jobs;
        let updateData: any = { status: newStatus };

        // If auto-setting schedule is enabled and we are assigning
        if (newStatus === 'ASSIGNED' && job?.auto_set_schedule && !job.is_flexible) {
            updateData = {
                status: 'CONFIRMED',
                scheduled_work_start: job.start_time,
                scheduled_work_end: job.end_time
            };
        }

        const { error } = await supabase
            .from("job_applications")
            .update(updateData)
            .eq("id", applicationId);

        if (error) throw error;

        // Send LINE notification (if enabled)
        const { data: settings } = await supabase
            .from("company_settings")
            .select("enable_line_notifications")
            .single();

        if (application?.workers?.line_user_id && settings?.enable_line_notifications !== false) {
            const { sendLineMessage } = await import("@/lib/line");
            const job = application.jobs;
            const worker = application.workers;

            if (newStatus === 'ASSIGNED') {
                const message = `【採用通知】\n\n${worker.full_name}さん\n\n案件「${job.title}」に採用されました！\n\n日時: ${new Date(job.start_time).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n場所: ${job.address_text || '未設定'}\n\n詳細はアプリでご確認ください。`;
                await sendLineMessage(worker.line_user_id, message);
            }
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
    await verifyAdmin();
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

export async function assignMultipleWorkers(applicationIds: string[]) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Get applications details including worker and job info for notifications
        const { data: applications } = await supabase
            .from("job_applications")
            .select(`
                *,
                workers(full_name, line_user_id),
                jobs(title, start_time, end_time, address_text, auto_set_schedule, is_flexible)
            `)
            .in("id", applicationIds);

        // Process individual updates to handle potential mixed auto-schedule settings
        if (applications) {
            for (const app of applications) {
                const job = app.jobs;
                let updateData: any = { status: 'ASSIGNED' };

                if (job?.auto_set_schedule && !job.is_flexible) {
                    updateData = {
                        status: 'CONFIRMED',
                        scheduled_work_start: job.start_time,
                        scheduled_work_end: job.end_time
                    };
                }

                const { error } = await supabase
                    .from("job_applications")
                    .update(updateData)
                    .eq("id", app.id);

                if (error) throw error;
            }
        }

        // Send LINE notifications (if enabled)
        const { data: settings } = await supabase
            .from("company_settings")
            .select("enable_line_notifications")
            .single();

        if (applications && settings?.enable_line_notifications !== false) {
            const { sendLineMessage } = await import("@/lib/line");

            await Promise.all(applications.map(async (app) => {
                if (app.workers?.line_user_id) {
                    const job = app.jobs;
                    const worker = app.workers;
                    const message = `【採用通知】\n\n${worker.full_name}さん\n\n案件「${job.title}」に採用されました！\n\n日時: ${new Date(job.start_time).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n場所: ${job.address_text || '未設定'}\n\n詳細はアプリでご確認ください。`;

                    try {
                        await sendLineMessage(worker.line_user_id, message);
                    } catch (e) {
                        console.error(`Failed to send LINE message to ${worker.full_name}:`, e);
                    }
                }
            }));
        }

        revalidatePath("/jobs/[id]", "page");
        return { success: true };
    } catch (error) {
        console.error("Error assigning multiple workers:", error);
        return { success: false, error };
    }
}
