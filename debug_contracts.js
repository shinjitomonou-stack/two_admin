const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env vars manually
try {
    const envPath = path.resolve(__dirname, 'admin/.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error('Error loading .env.local', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContracts() {
    // 1. Get a worker
    const { data: workers, error: workerError } = await supabase
        .from('workers')
        .select('id, full_name')
        .limit(1);

    if (workerError) {
        console.error('Error fetching workers:', workerError);
        return;
    }

    if (!workers || workers.length === 0) {
        console.log('No workers found');
        return;
    }

    const workerId = workers[0].id;
    console.log(`Checking contracts for worker: ${workers[0].full_name} (${workerId})`);

    // 2. Query used in the page
    const { data: individualContracts, error: contractError } = await supabase
        .from("job_individual_contracts")
        .select(`
        *,
        contract_templates(title),
        job_applications!inner (
            worker_id,
            jobs (title)
        )
    `)
        .eq("job_applications.worker_id", workerId);

    if (contractError) {
        console.error('Error fetching contracts:', contractError);
    } else {
        console.log(`Found ${individualContracts.length} contracts for worker ${workerId}`);
        console.log(JSON.stringify(individualContracts, null, 2));
    }

    // 3. Check if there are ANY contracts for this worker without the inner join filter, to see if the filter is the problem
    // We have to do this manually by fetching all contracts and filtering in JS or joining differently
    const { data: allContracts, error: allError } = await supabase
        .from("job_individual_contracts")
        .select(`
        *,
        job_applications (
            worker_id
        )
      `);

    if (allError) {
        console.error("Error fetching all contracts", allError);
    } else {
        const workerContracts = allContracts.filter(c => c.job_applications && c.job_applications.worker_id === workerId);
        console.log(`Manually filtered contracts count: ${workerContracts.length}`);
    }
}

checkContracts();
