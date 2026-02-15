"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function updateReportStatusAction(id: string, status: string, feedback?: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const updatePayload: any = { status };
        if (status === "REJECTED") {
            updatePayload.feedback = feedback || null;
        }

        const { data: reportData, error: reportError } = await supabase
            .from("reports")
            .update(updatePayload)
            .eq("id", id)
            .select("*, job_applications(job_id)")
            .single();

        if (reportError) throw reportError;

        // Auto-complete job if all reports are approved
        if (status === "APPROVED" && reportData.job_applications?.job_id) {
            const jobId = reportData.job_applications.job_id;

            // 1. Get all assigned/confirmed applications for this job
            const { data: apps, error: appsError } = await supabase
                .from("job_applications")
                .select("id, status, reports(id, status)")
                .eq("job_id", jobId)
                .in("status", ["ASSIGNED", "CONFIRMED"]);

            if (appsError) throw appsError;

            // 2. Check if every application has an approved report
            const allApproved = apps.length > 0 && apps.every(app =>
                app.reports && app.reports.some((r: any) => r.status === "APPROVED")
            );

            if (allApproved) {
                const { error: jobError } = await supabase
                    .from("jobs")
                    .update({ status: "COMPLETED" })
                    .eq("id", jobId);

                if (jobError) throw jobError;
                revalidatePath("/jobs");
                revalidatePath(`/jobs/${jobId}`);
            }
        }

        revalidatePath("/reports");
        revalidatePath(`/reports/${id}`);
        return { success: true, data: reportData };
    } catch (error) {
        console.error("Error updating report status:", error);
        return { success: false, error };
    }
}

export async function updateReportAction(id: string, payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("reports")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/reports");
        revalidatePath(`/reports/${id}`);
        return { success: true, data };
    } catch (error) {
        console.error("Error updating report:", error);
        return { success: false, error };
    }
}
