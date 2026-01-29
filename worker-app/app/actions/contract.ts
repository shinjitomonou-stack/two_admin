"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
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

    // Fetch worker profile for replacement
    const { data: worker } = await supabase
        .from("workers")
        .select("full_name, address")
        .eq("id", workerId)
        .single();

    // Fetch company settings for replacement
    const { data: company } = await supabase
        .from("company_settings")
        .select("*")
        .single();

    function replaceVariables(content: string) {
        let result = content;
        if (worker) {
            result = result
                .replace(/{{worker_name}}/g, worker.full_name || "")
                .replace(/{{worker_address}}/g, worker.address || "");
        }
        if (company) {
            result = result
                .replace(/{{company_name}}/g, company.name || "")
                .replace(/{{company_address}}/g, company.address || "")
                .replace(/{{company_rep}}/g, company.representative_name || "");
        }
        // Date Variables
        result = result.replace(/{{TODAY(\+(\d+))?}}/g, (match: string, p1: string, p2: string) => {
            const today = new Date();
            if (p2) {
                today.setDate(today.getDate() + parseInt(p2, 10));
            }
            return today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
        });
        return result;
    }

    const finalContent = replaceVariables(template.content_template);

    // Check if already signed
    const { data: existing } = await supabase
        .from("worker_basic_contracts")
        .select("id")
        .eq("worker_id", workerId)
        .eq("template_id", templateId)
        .single();

    if (existing) {
        await supabase
            .from("worker_basic_contracts")
            .update({
                signed_content_snapshot: finalContent,
                signed_at: new Date().toISOString(),
                ip_address: ip,
                user_agent: userAgent,
                status: "SIGNED"
            })
            .eq("id", existing.id);
    } else {
        await supabase
            .from("worker_basic_contracts")
            .insert([
                {
                    worker_id: workerId,
                    template_id: templateId,
                    signed_content_snapshot: finalContent,
                    signed_at: new Date().toISOString(),
                    ip_address: ip,
                    user_agent: userAgent,
                    status: "SIGNED"
                }
            ]);
    }

    revalidatePath("/contracts/basic");
    redirect("/contracts/basic?signed=true");
}

export async function signIndividualContract(formData: FormData) {
    const contractId = formData.get("contractId") as string;
    if (!contractId) return { error: "Contract ID is required" };

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

    // Fetch template content, worker, and job info
    const { data: contract } = await supabase
        .from("job_individual_contracts")
        .select(`
            template_id, 
            contract_templates(title, content_template),
            worker:workers!worker_id(full_name, address),
            job_applications!application_id(
                jobs(title, reward_amount, start_time, end_time, address_text)
            )
        `)
        .eq("id", contractId)
        .single();

    if (!contract || !contract.contract_templates) {
        return { error: "契約情報が見つかりません" };
    }

    // Fetch company settings
    const { data: company } = await supabase
        .from("company_settings")
        .select("*")
        .single();

    // @ts-ignore
    const templateContent = contract.contract_templates?.content_template;

    if (!templateContent) {
        return { error: "テンプレート内容が取得できませんでした" };
    }

    function replaceVariables(content: string) {
        let result = content;
        // @ts-ignore
        const workerData = Array.isArray(contract.worker) ? contract.worker[0] : contract.worker;
        if (workerData) {
            result = result
                .replace(/{{worker_name}}/g, workerData.full_name || "")
                .replace(/{{worker_address}}/g, workerData.address || "");
        }
        if (company) {
            result = result
                .replace(/{{company_name}}/g, company.name || "")
                .replace(/{{company_address}}/g, company.address || "")
                .replace(/{{company_rep}}/g, company.representative_name || "");
        }

        const app = Array.isArray(contract.job_applications) ? contract.job_applications[0] : contract.job_applications;
        const jobData = app?.jobs;
        if (jobData) {
            result = result
                .replace(/{{job_title}}/g, jobData.title || "")
                .replace(/{{reward_amount}}/g, Math.round(jobData.reward_amount || 0).toLocaleString())
                .replace(/{{start_time}}/g, jobData.start_time ? new Date(jobData.start_time).toLocaleDateString('ja-JP') : "")
                .replace(/{{start_date}}/g, jobData.start_time ? new Date(jobData.start_time).toLocaleDateString('ja-JP') : "")
                .replace(/{{end_time}}/g, jobData.end_time ? new Date(jobData.end_time).toLocaleDateString('ja-JP') : "")
                .replace(/{{end_date}}/g, jobData.end_time ? new Date(jobData.end_time).toLocaleDateString('ja-JP') : "")
                .replace(/{{address}}/g, jobData.address_text || "");
        }

        // Date Variables
        result = result.replace(/{{TODAY(\+(\d+))?}}/g, (match: string, p1: string, p2: string) => {
            const today = new Date();
            if (p2) {
                today.setDate(today.getDate() + parseInt(p2, 10));
            }
            return today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
        });
        return result;
    }

    const finalContent = replaceVariables(templateContent);

    // Update contract status
    const { error: updateError } = await supabase
        .from("job_individual_contracts")
        .update({
            signed_content_snapshot: finalContent,
            signed_at: new Date().toISOString(),
            ip_address: ip,
            user_agent: userAgent,
            status: "SIGNED",
            is_agreed: true
        })
        .eq("id", contractId);

    if (updateError) {
        console.error("Signing error:", updateError);
        return { error: "署名に失敗しました" };
    }

    // Send Slack notification (non-blocking)
    try {
        // @ts-ignore
        const workerData = Array.isArray(contract.worker) ? contract.worker[0] : contract.worker;
        const workerName = workerData?.full_name || "不明なワーカー";

        // @ts-ignore
        const template = Array.isArray(contract.contract_templates) ? contract.contract_templates[0] : contract.contract_templates;
        const contractName = template?.title || "不明な契約";

        const adminAppUrl = process.env.ADMIN_APP_URL || "https://admin.teo-work.com";
        const detailUrl = `${adminAppUrl}/contracts/individual/${contractId}`;

        await sendSlackNotification(`<!here> 🤝 *個別契約締結のお知らせ*\n\n*ワーカー:* ${workerName}\n*契約名:* ${contractName}\n\nワーカーが個別契約に署名しました。\n詳細はこちら: ${detailUrl}`);
    } catch (slackError) {
        console.error("Failed to send Slack notification:", slackError);
    }

    revalidatePath(`/contracts/individual/${contractId}`);
    redirect(`/contracts/individual/${contractId}?signed=true`);
}
