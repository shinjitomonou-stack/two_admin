"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function signBasicContract(templateId: string, workerId: string) {
    const supabase = await createClient();
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
    const cookieStore = await cookies();
    const workerId = cookieStore.get("worker_id")?.value;

    if (!workerId || !contractId) {
        return { error: "不正なリクエストです" };
    }

    const supabase = await createClient();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Fetch template content to snapshot (re-fetch to ensure integrity)
    const { data: contract } = await supabase
        .from("job_individual_contracts")
        .select("template_id, contract_templates(content_template)")
        .eq("id", contractId)
        .single();

    if (!contract || !contract.contract_templates) {
        return { error: "契約情報が見つかりません" };
    }

    // Handle contract_templates being an array or object depending on client generation
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
            signed_content_snapshot: templateContent, // Snapshot current template
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

    revalidatePath(`/contracts/individual/${contractId}`);
    redirect(`/contracts/individual/${contractId}?signed=true`);
}
