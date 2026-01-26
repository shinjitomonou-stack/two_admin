"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendSlackNotification } from "@/lib/slack";

export async function signBasicContract(templateId: string) {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    const workerId = user?.id;

    if (!workerId) {
        return { error: "ログインが必要です" };
    }

    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Fetch template content to snapshot
    const { data: template } = await supabase
        .from("contract_templates")
        .select("content_template")
        .eq("id", templateId)
        .single();

    if (!template) {
        return { error: "テンプレートが見つかりません" };
    }

    // Check for existing contract (PENDING or any status)
    const { data: existingContracts, error: fetchError } = await supabase
        .from("worker_basic_contracts")
        .select("id, status")
        .eq("worker_id", workerId)
        .eq("template_id", templateId)
        .order("created_at", { ascending: false });

    if (fetchError) {
        console.error("Fetch error:", fetchError);
        return { error: "契約情報の取得に失敗しました" };
    }

    let error;

    // Find PENDING contract to update
    const pendingContract = existingContracts?.find(c => c.status === 'PENDING');

    // Check if already signed
    const signedContract = existingContracts?.find(c => c.status === 'SIGNED');
    if (signedContract && !pendingContract) {
        return { error: "この契約は既に締結されています" };
    }

    if (pendingContract) {
        // Update existing PENDING request
        const result = await supabase
            .from("worker_basic_contracts")
            .update({
                signed_content_snapshot: template.content_template,
                signed_at: new Date().toISOString(),
                ip_address: ip,
                user_agent: userAgent,
                consent_hash: "mock_hash_" + Date.now(),
                status: "SIGNED"
            })
            .eq("id", pendingContract.id);
        error = result.error;
    } else if (!signedContract) {
        // Insert new signed contract only if no SIGNED contract exists
        const result = await supabase
            .from("worker_basic_contracts")
            .insert([
                {
                    worker_id: workerId,
                    template_id: templateId,
                    signed_content_snapshot: template.content_template,
                    signed_at: new Date().toISOString(),
                    ip_address: ip,
                    user_agent: userAgent,
                    consent_hash: "mock_hash_" + Date.now(),
                    status: "SIGNED"
                },
            ]);
        error = result.error;
    }

    if (error) {
        console.error("Signing error:", error);
        return { error: "契約締結に失敗しました" };
    }

    revalidatePath("/contracts/basic");
    revalidatePath("/"); // Revalidate home page to update alert
    redirect("/contracts/basic?signed=true");
}

export async function signIndividualContract(formData: FormData) {
    const contractId = formData.get("contract_id") as string;

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    const workerId = user?.id;

    if (!workerId || !contractId) {
        return { error: "不正なリクエストです" };
    }
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Fetch template content and job title
    const { data: contract } = await supabase
        .from("job_individual_contracts")
        .select(`
            template_id, 
            contract_templates(content_template),
            job_applications(
                jobs(title),
                workers(full_name)
            )
        `)
        .eq("id", contractId)
        .single();

    if (!contract || !contract.contract_templates) {
        return { error: "契約情報が見つかりません" };
    }

    // Handle contract_templates being an array or object
    const templateContent = Array.isArray(contract.contract_templates)
        ? contract.contract_templates[0]?.content_template
        // @ts-ignore
        : contract.contract_templates?.content_template;

    if (!templateContent) {
        return { error: "テンプレート内容が取得できませんでした" };
    }

    // Update contract status
    const { error } = await supabase
        .from("job_individual_contracts")
        .update({
            signed_content_snapshot: templateContent,
            signed_at: new Date().toISOString(),
            ip_address: ip,
            user_agent: userAgent,
            status: "SIGNED",
            is_agreed: true
        })
        .eq("id", contractId);

    if (error) {
        console.error("Signing error:", error);
        return { error: "署名に失敗しました" };
    }

    // Send Slack notification (non-blocking)
    try {
        const jobApps = contract.job_applications;
        // Supabase returns an array for 1-to-many relations
        const app: any = Array.isArray(jobApps) ? jobApps[0] : jobApps;

        const job = app?.jobs;
        const worker = app?.workers;
        const workerName = worker?.full_name || "不明なワーカー";
        const jobTitle = job?.title || "不明な案件";

        const adminAppUrl = process.env.ADMIN_APP_URL || "https://admin.teo-work.com";
        const detailUrl = `${adminAppUrl}/contracts/individual/${contractId}`;

        await sendSlackNotification(`<!here> 🤝 *個別契約締結のお知らせ*\n\n*ワーカー:* ${workerName}\n*案件:* ${jobTitle}\n\nワーカーが個別契約に署名しました。\n詳細はこちら: ${detailUrl}`);
    } catch (slackError) {
        console.error("Failed to send Slack notification:", slackError);
    }

    revalidatePath(`/contracts/individual/${contractId}`);
    redirect(`/contracts/individual/${contractId}?signed=true`);
}
