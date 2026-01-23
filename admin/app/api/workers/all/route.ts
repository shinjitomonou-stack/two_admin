import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();

    try {
        const { data: workers, error } = await supabase
            .from("workers")
            .select("id, full_name, email")
            .order("full_name", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ workers });
    } catch (error) {
        console.error("Error fetching workers:", error);
        return NextResponse.json({ workers: [] }, { status: 500 });
    }
}
