import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        await verifyAdmin();
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get("jobId");

        const supabase = await createClient();

        // Fetch all workers
        const { data: workers, error } = await supabase
            .from("workers")
            .select("id, full_name, email")
            .order("full_name", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ workers });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
}
