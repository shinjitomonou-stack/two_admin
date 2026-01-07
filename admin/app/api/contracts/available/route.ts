import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        await verifyAdmin();
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get("jobId");

        if (!jobId) {
            return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Get the job to find the client_id
        const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("client_id")
            .eq("id", jobId)
            .single();

        if (jobError || !job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // 2. Fetch active individual contracts for this client
        // We look for all active 'PLACING' contracts (cross-client allowed)
        const { data: contracts, error: contractError } = await supabase
            .from("client_job_contracts")
            .select("id, title, contract_amount, status, clients(name)")
            .eq("trading_type", "PLACING") // Only placement contracts for now
            .in("status", ["ACTIVE", "PENDING", "DRAFT"]) // Including pending/draft for assignment
            .order("created_at", { ascending: false });

        if (contractError) {
            return NextResponse.json({ error: contractError.message }, { status: 500 });
        }

        return NextResponse.json({ contracts: contracts || [] });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 403 });
    }
}
