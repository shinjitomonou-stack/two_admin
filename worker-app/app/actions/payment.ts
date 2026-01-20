import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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

        revalidatePath(`/payments/${id}`);
        revalidatePath("/payments");
        return { success: true, data };
    } catch (error) {
        console.error("Error approving payment notice:", error);
        return { success: false, error };
    }
}
