"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function applyJob(jobId: string) {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    const workerId = user?.id;

    if (!workerId) {
        return { error: "ログインが必要です" };
    }

    // Check if already applied
    const { data: existingApplication } = await supabase
        .from("job_applications")
        .select("id")
        .eq("job_id", jobId)
        .eq("worker_id", workerId)
        .single();

    if (existingApplication) {
        return { error: "既に応募済みです" };
    }

    // Create application
    const { error } = await supabase
        .from("job_applications")
        .insert([
            {
                job_id: jobId,
                worker_id: workerId,
                status: "APPLIED",
            },
        ]);

    if (error) {
        console.error("Error applying for job:", error);
        return { error: "応募に失敗しました" };
    }

    revalidatePath(`/jobs/${jobId}`);
    return { success: true };
}
