import { createClient } from "@/lib/supabase/server";

export default async function DebugPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Get worker
    const { data: worker } = await supabase.from("workers").select("*").eq("id", id).single();

    // 2. Get applications
    const { data: applications } = await supabase.from("job_applications").select("*").eq("worker_id", id);

    // 3. Get contracts for these applications
    let contracts: any[] = [];
    if (applications && applications.length > 0) {
        const appIds = applications.map(a => a.id);

        // Query A: Simple select
        const { data: dataA, error: errorA } = await supabase
            .from("job_individual_contracts")
            .select("*")
            .in("application_id", appIds);

        // Query B: With Job Applications
        const { data: dataB, error: errorB } = await supabase
            .from("job_individual_contracts")
            .select("*, job_applications(*)")
            .in("application_id", appIds);

        // Query C: With Templates
        const { data: dataC, error: errorC } = await supabase
            .from("job_individual_contracts")
            .select("*, contract_templates(*)")
            .in("application_id", appIds);

        // Query D: EXACT Query from Worker Page
        const { data: dataD, error: errorD } = await supabase
            .from("job_individual_contracts")
            .select(`
                *,
                contract_templates(title),
                job_applications (
                    jobs (title)
                )
            `)
            .in("application_id", appIds);

        contracts = [
            { name: "Query A (Simple)", data: dataA, error: errorA },
            { name: "Query B (With Apps)", data: dataB, error: errorB },
            { name: "Query C (With Templates)", data: dataC, error: errorC },
            { name: "Query D (Exact Nested)", data: dataD, error: errorD }
        ];
    }

    // 4. Get ALL contracts and see if any match this worker (manual check)
    const { data: allContracts } = await supabase
        .from("job_individual_contracts")
        .select("*, job_applications(worker_id, jobs(title))");

    // @ts-ignore
    const manualMatches = allContracts?.filter(c => c.job_applications?.worker_id === id) || [];

    return (
        <div className="p-8 font-mono text-xs space-y-8">
            <h1 className="text-xl font-bold">Debug Info for Worker: {id}</h1>

            <section>
                <h2 className="text-lg font-bold bg-slate-100 p-2">Worker</h2>
                <pre>{JSON.stringify(worker, null, 2)}</pre>
            </section>

            <section>
                <h2 className="text-lg font-bold bg-slate-100 p-2">Applications ({applications?.length})</h2>
                <pre>{JSON.stringify(applications, null, 2)}</pre>
            </section>

            <section>
                <h2 className="text-lg font-bold bg-slate-100 p-2">Contracts via Application ID ({contracts.length})</h2>
                <pre>{JSON.stringify(contracts, null, 2)}</pre>
            </section>

            <section>
                <h2 className="text-lg font-bold bg-slate-100 p-2">Manual Matches from All Contracts ({manualMatches.length})</h2>
                <pre>{JSON.stringify(manualMatches, null, 2)}</pre>
            </section>
        </div>
    );
}
