import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { applicationId, scheduledStart, scheduledEnd } = await request.json();

        if (!applicationId || !scheduledStart || !scheduledEnd) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Verify worker is authenticated
        const cookieStore = await cookies();
        const workerId = cookieStore.get("worker_id")?.value;

        if (!workerId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = await createClient();

        // Verify the application belongs to this worker
        const { data: application } = await supabase
            .from("job_applications")
            .select("worker_id")
            .eq("id", applicationId)
            .single();

        if (!application || application.worker_id !== workerId) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // Update the schedule
        const { error } = await supabase
            .from("job_applications")
            .update({
                scheduled_work_start: scheduledStart,
                scheduled_work_end: scheduledEnd,
            })
            .eq("id", applicationId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating schedule:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
