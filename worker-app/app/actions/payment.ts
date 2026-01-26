"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendSlackNotification } from "@/lib/slack";

export async function approvePaymentNotice(id: string) {
    const supabase = await createClient();

    // Auth check - ensure this notice belongs to the logged-in worker
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Unauthorized" };

    // Capture approval audit trail
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    try {
        const { data, error } = await supabase
            .from("payment_notices")
            .update({
                status: "APPROVED",
                approved_at: new Date().toISOString(),
                approved_ip_address: ipAddress,
                approved_user_agent: userAgent
            })
            .eq("id", id)
            .eq("worker_id", user.id) // Security check
            .select()
            .single();

        if (error) throw error;

        // Send Slack notification (non-blocking)
        try {
            const { data: worker } = await supabase
                .from("workers")
                .select("full_name")
                .eq("id", user.id)
                .single();

            const workerName = worker?.full_name || "不明なワーカー";
            const month = data?.month || "不明な月";
            const totalAmount = Math.round((data?.total_amount || 0) + (data?.tax_amount || 0)).toLocaleString();

            const adminAppUrl = process.env.ADMIN_APP_URL || "https://admin.teo-work.com";
            const detailUrl = `${adminAppUrl}/workers/payment/notices/${id}`;

            await sendSlackNotification(`<!here> 💰 *支払通知承認のお知らせ*\n\n*ワーカー:* ${workerName}\n*対象月:* ${month}\n*合計金額:* ¥${totalAmount}\n\nワーカーが支払通知を承認しました。\n詳細はこちら: ${detailUrl}`);
        } catch (slackError) {
            console.error("Failed to send Slack notification:", slackError);
        }

        revalidatePath(`/payments/${id}`);
        revalidatePath("/payments");
        return { success: true, data };
    } catch (error) {
        console.error("Error approving payment notice:", error);
        return { success: false, error };
    }
}
