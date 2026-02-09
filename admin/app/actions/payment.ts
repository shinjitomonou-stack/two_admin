"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";
import { sendLineMessage } from "@/lib/line";

export async function generatePaymentNotices(month: string, workersData: any[]) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const results = [];
        for (const data of workersData) {
            // Check if already exists for this month/worker
            const { data: existing } = await supabase
                .from("payment_notices")
                .select("id")
                .eq("worker_id", data.worker_id)
                .eq("month", month)
                .maybeSingle();

            const payload = {
                worker_id: data.worker_id,
                month: month,
                total_amount: data.total_payment,
                tax_amount: Math.round(data.total_payment * 1.1) - data.total_payment,
                job_details: data.details || [],
                status: "DRAFT",
            };

            if (existing) {
                // Update existing draft
                const { data: updated, error } = await supabase
                    .from("payment_notices")
                    .update(payload)
                    .eq("id", existing.id)
                    .select()
                    .single();
                if (error) throw error;
                results.push(updated);
            } else {
                // Create new
                const { data: inserted, error } = await supabase
                    .from("payment_notices")
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                results.push(inserted);
            }
        }

        revalidatePath("/workers/payment/notices");
        return { success: true, count: results.length };
    } catch (error) {
        console.error("Error generating payment notices:", error);
        return { success: false, error };
    }
}

export async function updatePaymentNoticeStatus(id: string, status: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const updateData: any = { status };
        const now = new Date().toISOString();

        if (status === "ISSUED") updateData.issued_at = now;
        if (status === "APPROVED") updateData.approved_at = now;
        if (status === "PAID") updateData.paid_at = now;

        const { data, error } = await supabase
            .from("payment_notices")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        // Automatically send notification if status is updated to ISSUED
        if (status === "ISSUED") {
            try {
                await sendPaymentNoticeNotification(id);
            } catch (notifyError) {
                console.error("Failed to send automatic notification in updatePaymentNoticeStatus:", notifyError);
            }
        }

        revalidatePath("/workers/payment/notices");
        return { success: true, data };
    } catch (error) {
        console.error("Error updating payment notice status:", error);
        return { success: false, error };
    }
}

export async function sendPaymentNoticeNotification(id: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data: notice, error: noticeError } = await supabase
            .from("payment_notices")
            .select(`
                *,
                worker:workers(full_name, line_id, line_user_id)
            `)
            .eq("id", id)
            .single();

        if (noticeError || !notice) throw new Error("Payment notice not found");

        const worker = notice.worker as any;
        const lineUserId = worker?.line_id || worker?.line_user_id;

        if (!lineUserId) {
            return { success: false, message: "Worker has no LINE ID" };
        }

        const WORKER_APP_URL = process.env.WORKER_APP_URL || "https://support.teo-work.com";
        const noticeUrl = `${WORKER_APP_URL}/payments/${id}?openExternalBrowser=1`;

        const message = `【支払通知書発行のお知らせ】\n\n${worker.full_name}様\n\n${notice.month}分の支払通知書（支払明細）が発行されました。\n内容をご確認の上、問題がなければ承認をお願いいたします。\n\n詳細はこちら：\n${noticeUrl}`;

        const result = await sendLineMessage(lineUserId, message);

        if (!result.success) {
            console.error(`Failed to send LINE message:`, result.error);
            return { success: false, error: result.error };
        }

        await supabase
            .from("payment_notices")
            .update({ notification_sent_at: new Date().toISOString() })
            .eq("id", id);

        return { success: true };
    } catch (error: any) {
        console.error("Error sending notification:", error);
        return { success: false, error: error.message };
    }
}

export async function completePayment(id: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Get payment notice with worker info
        const { data: notice, error: noticeError } = await supabase
            .from("payment_notices")
            .select(`
                *,
                worker:workers(full_name, line_id, line_user_id)
            `)
            .eq("id", id)
            .single();

        if (noticeError || !notice) throw new Error("Payment notice not found");

        // Get scheduled payment date for this month
        const { data: schedule } = await supabase
            .from("payment_schedules")
            .select("scheduled_payment_date")
            .eq("month", notice.month)
            .single();

        // Update status to PAID
        const { error: updateError } = await supabase
            .from("payment_notices")
            .update({
                status: "PAID",
                paid_at: new Date().toISOString()
            })
            .eq("id", id);

        if (updateError) throw updateError;

        // Send LINE notification
        const worker = notice.worker as any;
        const lineUserId = worker?.line_id || worker?.line_user_id;

        if (lineUserId) {
            const paymentDateText = schedule?.scheduled_payment_date
                ? `\n\nお支払予定日: ${new Date(schedule.scheduled_payment_date).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' })}`
                : "";

            const message = `【お支払処理受付のお知らせ】\n\n${worker.full_name}様\n\n${notice.month}分の支払処理を受け付けました。${paymentDateText}\n\nご確認ありがとうございました。`;

            await sendLineMessage(lineUserId, message);
        }

        revalidatePath("/workers/payment/notices");
        revalidatePath(`/workers/payment/notices/${id}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error completing payment:", error);
        return { success: false, error: error.message };
    }
}

export async function upsertPaymentSchedule(month: string, scheduledPaymentDate: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("payment_schedules")
            .upsert({
                month,
                scheduled_payment_date: scheduledPaymentDate,
                updated_at: new Date().toISOString()
            }, {
                onConflict: "month"
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/workers/payment/notices");
        return { success: true, data };
    } catch (error) {
        console.error("Error upserting payment schedule:", error);
        return { success: false, error };
    }
}
