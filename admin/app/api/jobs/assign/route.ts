import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
    const { jobId, workerId } = await request.json();

    if (!jobId || !workerId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if application already exists
    const { data: existing } = await supabase
        .from("job_applications")
        .select("id")
        .eq("job_id", jobId)
        .eq("worker_id", workerId)
        .single();

    if (existing) {
        return NextResponse.json({ error: "このワーカーは既に応募しています" }, { status: 400 });
    }

    // Create new application with ASSIGNED status
    const { error } = await supabase
        .from("job_applications")
        .insert({
            job_id: jobId,
            worker_id: workerId,
            status: "ASSIGNED",
        });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath(`/jobs/${jobId}`);
    return NextResponse.json({ success: true });
}
