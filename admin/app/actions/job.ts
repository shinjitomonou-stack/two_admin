"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function createJob(payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("jobs")
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/jobs");
        return { success: true, data };
    } catch (error) {
        console.error("Error creating job:", error);
        return { success: false, error };
    }
}

export async function updateJob(id: string, payload: any) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("jobs")
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/jobs");
        revalidatePath(`/jobs/${id}`);
        return { success: true, data };
    } catch (error) {
        console.error("Error updating job:", error);
        return { success: false, error };
    }
}

export async function bulkCreateJobs(jobs: any[]) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Resolve client names to IDs
        const clientNames = Array.from(new Set(jobs.map(j => j.client_name).filter(Boolean)));
        const { data: clients } = await supabase
            .from("clients")
            .select("id, name")
            .in("name", clientNames);

        const clientMap = new Map(clients?.map(c => [c.name, c.id]));

        // Resolve template names to IDs
        const templateNames = Array.from(new Set(jobs.map(j => j.template_name).filter(Boolean)));
        let templateMap = new Map<string, string>();
        if (templateNames.length > 0) {
            const { data: templates } = await supabase
                .from("report_templates")
                .select("id, name")
                .in("name", templateNames);
            templateMap = new Map(templates?.map(t => [t.name, t.id]));
        }

        const payloads = jobs.map(job => {
            const clientId = clientMap.get(job.client_name);
            if (!clientId) throw new Error(`クライアントが見つかりません: ${job.client_name}`);

            const reportTemplateId = job.template_name ? templateMap.get(job.template_name) : null;

            // Normalize date strings (allow / and -)
            const normalizeDate = (d: string) => d?.replace(/\//g, "-") || "";
            const normalizedDate = normalizeDate(job.date);
            const normalizedPeriodStart = normalizeDate(job.period_start);
            const normalizedPeriodEnd = normalizeDate(job.period_end);

            let startDateTime: Date;
            let endDateTime: Date;
            let workPeriodStart: string | null = null;
            let workPeriodEnd: string | null = null;

            if (job.is_flexible === "はい" || job.is_flexible === true) {
                startDateTime = new Date(`${normalizedPeriodStart}T00:00:00`);
                endDateTime = new Date(`${normalizedPeriodEnd}T23:59:59`);
                workPeriodStart = startDateTime.toISOString();
                workPeriodEnd = endDateTime.toISOString();
            } else {
                startDateTime = new Date(`${normalizedDate}T${job.start_time || "00:00"}`);
                endDateTime = new Date(`${normalizedDate}T${job.end_time || "23:59"}`);
            }

            return {
                title: job.title,
                client_id: clientId,
                description: job.description || null,
                address_text: job.address_text,
                reward_amount: parseInt(job.reward_amount),
                billing_amount: job.billing_amount ? parseInt(job.billing_amount) : null,
                max_workers: parseInt(job.max_workers),
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                is_flexible: job.is_flexible === "はい" || job.is_flexible === true,
                work_period_start: workPeriodStart,
                work_period_end: workPeriodEnd,
                report_template_id: reportTemplateId,
                status: "OPEN", // Default to OPEN for bulk import as requested usually
                reward_type: "FIXED",
            };
        });

        const { data, error } = await supabase
            .from("jobs")
            .insert(payloads)
            .select();

        if (error) throw error;

        revalidatePath("/jobs");
        return { success: true, count: data.length };
    } catch (error: any) {
        console.error("Error bulk creating jobs:", error);
        return { success: false, error: error.message || "一括登録中にエラーが発生しました" };
    }
}
