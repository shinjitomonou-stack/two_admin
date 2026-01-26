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
        revalidatePath("/");
        return { success: true, data };
    } catch (error) {
        console.error("Error updating job:", error);
        return { success: false, error };
    }
}

export async function deleteJob(id: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // 1. Get all application IDs for this job to delete their child records
        const { data: applications } = await supabase
            .from("job_applications")
            .select("id")
            .eq("job_id", id);

        if (applications && applications.length > 0) {
            const appIds = applications.map(app => app.id);

            // 2. Delete reports linked to these applications
            await supabase.from("reports").delete().in("application_id", appIds);

            // 3. Delete individual contracts linked to these applications
            await supabase.from("job_individual_contracts").delete().in("application_id", appIds);

            // 4. Delete the applications themselves
            await supabase.from("job_applications").delete().eq("job_id", id);
        }

        // 5. Delete client_job_contracts (Partners/toB contracts) linked to this job
        await supabase.from("client_job_contracts").delete().eq("job_id", id);

        // 6. Finally delete the job
        const { error } = await supabase
            .from("jobs")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/jobs");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting job:", error);
        return { success: false, error };
    }
}

export async function duplicateJob(
    id: string,
    options?: {
        title?: string;
        address_text?: string;
        workerIds?: string[];
        start_time?: string;
        end_time?: string;
    }
) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Fetch existing job
        const { data: job, error: fetchError } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError) throw fetchError;

        // Prepare new job payload (removing unique/auto-generated fields)
        const { id: _, created_at: __, ...rest } = job;
        const payload = {
            ...rest,
            title: options?.title || job.title,
            address_text: options?.address_text || job.address_text,
            start_time: options?.start_time || job.start_time,
            end_time: options?.end_time || job.end_time,
            status: "DRAFT", // Reset to draft for safety
        };

        const { data: newJob, error: insertError } = await supabase
            .from("jobs")
            .insert(payload)
            .select()
            .single();

        if (insertError) throw insertError;

        // Copy assigned workers if workerIds are provided
        if (options?.workerIds && options.workerIds.length > 0) {
            const isAutoSet = newJob.auto_set_schedule && !newJob.is_flexible;

            const applications = options.workerIds.map(workerId => ({
                job_id: newJob.id,
                worker_id: workerId,
                status: isAutoSet ? "CONFIRMED" : "ASSIGNED",
                scheduled_work_start: isAutoSet ? newJob.start_time : null,
                scheduled_work_end: isAutoSet ? newJob.end_time : null,
            }));

            const { error: appError } = await supabase
                .from("job_applications")
                .insert(applications);

            if (appError) {
                console.error("Error copying workers:", appError);
                // Don't throw - job was created successfully
            }
        }

        revalidatePath("/jobs");
        revalidatePath("/");
        return { success: true, data: newJob };
    } catch (error) {
        console.error("Error duplicating job:", error);
        return { success: false, error };
    }
}

export async function bulkCreateJobs(jobs: any[], defaultPublish: boolean = true) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Pre-validate client names and collect unique names for bulk lookup
        const clientNames = Array.from(new Set(jobs.map(j => {
            if (!j.client_name) {
                throw new Error(`クライアント/パートナー名が未入力です: ${j.title || "不明な案件"}`);
            }
            return j.client_name.trim();
        }).filter(Boolean)));

        const { data: clients, error: clientFetchError } = await supabase
            .from("clients")
            .select("id, name")
            .in("name", clientNames);

        if (clientFetchError) throw clientFetchError;

        const clientMap = new Map(clients?.map(c => [c.name, c.id]));

        // Resolve template names to IDs
        const templateNames = Array.from(new Set(jobs.map(j => j.template_name).filter(Boolean)));
        let templateMap = new Map<string, string>();
        if (templateNames.length > 0) {
            const { data: templates, error: templateFetchError } = await supabase
                .from("report_templates")
                .select("id, name")
                .in("name", templateNames);
            templateMap = new Map(templates?.map(t => [t.name, t.id]));
        }

        const payloads = jobs.map(job => {
            const clientId = clientMap.get(job.client_name?.trim());
            if (!clientId) throw new Error(`クライアント/パートナーが見つかりません: ${job.client_name}`);

            const reportTemplateId = job.template_name ? templateMap.get(job.template_name) : null;

            // Robust Date/Time Normalization
            const formatISOColorDate = (d: string) => {
                if (!d) return "";
                const parts = d.replace(/\//g, "-").split("-");
                if (parts.length !== 3) return d;
                const y = parts[0];
                const m = parts[1].padStart(2, "0");
                const day = parts[2].padStart(2, "0");
                return `${y}-${m}-${day}`;
            };

            const formatISOTime = (t: string, defaultTime: string) => {
                const time = (t || defaultTime).trim();
                const parts = time.split(":");
                const h = parts[0].padStart(2, "0");
                const m = (parts[1] || "00").padStart(2, "0");
                const s = (parts[2] || "00").padStart(2, "0");
                return `${h}:${m}:${s}`;
            };

            let normalizedDate = formatISOColorDate(job.date);
            let normalizedPeriodStart = formatISOColorDate(job.period_start);
            let normalizedPeriodEnd = formatISOColorDate(job.period_end);

            const isFlexible = job.is_flexible === "はい" || job.is_flexible === true;

            // Fallback logic
            if (!isFlexible && !normalizedDate && normalizedPeriodStart) {
                normalizedDate = normalizedPeriodStart;
            }
            if (isFlexible && !normalizedPeriodEnd && normalizedPeriodStart) {
                normalizedPeriodEnd = normalizedPeriodStart;
            }

            let startDateTime: Date;
            let endDateTime: Date;
            let workPeriodStart: string | null = null;
            let workPeriodEnd: string | null = null;

            if (isFlexible) {
                if (!normalizedPeriodStart) throw new Error(`期間開始日が未入力です: ${job.title || "不明な案件"}`);
                startDateTime = new Date(`${normalizedPeriodStart}T00:00:00+09:00`);
                endDateTime = new Date(`${normalizedPeriodEnd || normalizedPeriodStart}T23:59:59+09:00`);

                if (isNaN(startDateTime.getTime())) {
                    throw new Error(`期間開始日が正しくありません: ${job.title} (${normalizedPeriodStart})`);
                }
                if (isNaN(endDateTime.getTime())) {
                    throw new Error(`期間終了日が正しくありません: ${job.title} (${normalizedPeriodEnd || normalizedPeriodStart})`);
                }

                workPeriodStart = startDateTime.toISOString();
                workPeriodEnd = endDateTime.toISOString();
            } else {
                if (!normalizedDate) throw new Error(`日付が未入力です: ${job.title || "不明な案件"}`);
                const startTime = formatISOTime(job.start_time, "00:00");
                const endTime = formatISOTime(job.end_time, "23:59");

                startDateTime = new Date(`${normalizedDate}T${startTime}+09:00`);
                endDateTime = new Date(`${normalizedDate}T${endTime}+09:00`);

                if (isNaN(startDateTime.getTime())) {
                    throw new Error(`開始時間が正しくありません: ${job.title} (${normalizedDate}T${startTime})`);
                }
                if (isNaN(endDateTime.getTime())) {
                    throw new Error(`終了時間が正しくありません: ${job.title} (${normalizedDate}T${endTime})`);
                }
            }

            // Robust number parsing
            const parseNumber = (val: any) => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                const clean = String(val).replace(/[^\d.]/g, ''); // Allow decimal point
                return parseFloat(clean) || 0;
            };

            // Tax Mode Parsing
            const parseTaxMode = (val: any) => {
                if (!val) return 'EXCL';
                const str = String(val).trim();
                if (str === '税込' || str === 'INCL') return 'INCL';
                return 'EXCL'; // Default to EXCL
            };

            if (!job.title) throw new Error("案件タイトルが未入力の行があります。");
            if (!job.address_text) throw new Error(`住所が未入力です: ${job.title}`);

            const maxWorkers = parseNumber(job.max_workers);
            if (maxWorkers <= 0) throw new Error(`募集人数は1人以上に設定してください: ${job.title}`);

            const rewardTaxMode = parseTaxMode(job.reward_tax_mode);
            const billingTaxMode = parseTaxMode(job.billing_tax_mode);

            return {
                title: job.title,
                client_id: clientId,
                description: job.description || null,
                address_text: job.address_text,
                reward_amount: parseNumber(job.reward_amount),
                billing_amount: job.billing_amount ? parseNumber(job.billing_amount) : null,
                reward_tax_mode: rewardTaxMode,
                billing_tax_mode: billingTaxMode,
                max_workers: maxWorkers,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                is_flexible: isFlexible,
                work_period_start: workPeriodStart,
                work_period_end: workPeriodEnd,
                report_template_id: reportTemplateId,
                status: job.status || (defaultPublish ? "OPEN" : "DRAFT"),
                reward_type: "FIXED",
                auto_set_schedule: job.auto_set_schedule === "はい" || job.auto_set_schedule === true,
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
export async function bulkUpdateJobs(jobs: any[]) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Resolve references (Clients and Templates)
        const clientNames = Array.from(new Set(jobs.map(j => j.client_name?.trim()).filter(Boolean)));
        let clientMap = new Map<string, string>();
        if (clientNames.length > 0) {
            const { data: clients } = await supabase.from("clients").select("id, name").in("name", clientNames);
            clientMap = new Map(clients?.map(c => [c.name, c.id]));
        }

        const templateNames = Array.from(new Set(jobs.map(j => j.template_name?.trim()).filter(Boolean)));
        let templateMap = new Map<string, string>();
        if (templateNames.length > 0) {
            const { data: templates } = await supabase.from("report_templates").select("id, name").in("name", templateNames);
            templateMap = new Map(templates?.map(t => [t.name, t.id]));
        }

        const payloads = jobs.map(job => {
            const isFlexible = job.is_flexible === "はい" || job.is_flexible === true;

            // Date normalization (reusing logic from bulkCreateJobs)
            const formatISO = (d: string) => {
                if (!d) return "";
                const parts = d.replace(/\//g, "-").split("-");
                if (parts.length !== 3) return d;
                return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
            };

            const formatISOTime = (t: string, def: string) => {
                const parts = (t || def).split(":");
                return `${parts[0].padStart(2, "0")}:${(parts[1] || "00").padStart(2, "0")}:00`;
            };

            let startDateTime: Date;
            let endDateTime: Date;
            if (isFlexible) {
                const start = formatISO(job.period_start || job.date);
                const end = formatISO(job.period_end || start);
                startDateTime = new Date(`${start}T00:00:00+09:00`);
                endDateTime = new Date(`${end}T23:59:59+09:00`);
            } else {
                const date = formatISO(job.date || job.period_start);
                startDateTime = new Date(`${date}T${formatISOTime(job.start_time, "00:00")}+09:00`);
                endDateTime = new Date(`${date}T${formatISOTime(job.end_time, "23:59")}+09:00`);
            }

            const payload: any = {
                title: job.title,
                description: job.description || null,
                address_text: job.address_text,
                reward_amount: parseFloat(String(job.reward_amount).replace(/[^\d.]/g, '')) || 0,
                billing_amount: job.billing_amount ? parseFloat(String(job.billing_amount).replace(/[^\d.]/g, '')) : null,
                reward_tax_mode: (job.reward_tax_mode === '税込' || job.reward_tax_mode === 'INCL') ? 'INCL' : 'EXCL',
                billing_tax_mode: (job.billing_tax_mode === '税込' || job.billing_tax_mode === 'INCL') ? 'INCL' : 'EXCL',
                max_workers: parseInt(job.max_workers) || 1,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                is_flexible: isFlexible,
                work_period_start: isFlexible ? startDateTime.toISOString() : null,
                work_period_end: isFlexible ? endDateTime.toISOString() : null,
                auto_set_schedule: job.auto_set_schedule === "はい" || job.auto_set_schedule === true,
                status: job.status || "DRAFT",
            };

            if (job.id) payload.id = job.id;

            if (job.client_name) {
                const cid = clientMap.get(job.client_name.trim());
                if (!cid) throw new Error(`クライアントが見つかりません: ${job.client_name}`);
                payload.client_id = cid;
            }

            if (job.template_name) {
                const tid = templateMap.get(job.template_name.trim());
                if (!tid) throw new Error(`レポートテンプレートが見つかりません: ${job.template_name}`);
                payload.report_template_id = tid;
            }

            return payload;
        });

        const { data, error } = await supabase
            .from("jobs")
            .upsert(payloads, { onConflict: 'id' })
            .select();

        if (error) throw error;

        revalidatePath("/jobs");
        revalidatePath("/");
        return { success: true, count: data.length };
    } catch (error: any) {
        console.error("Error bulk updating jobs:", error);
        return { success: false, error: error.message || "一括更新中にエラーが発生しました" };
    }
}
