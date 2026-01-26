
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load from .env.local
const envPath = path.join(__dirname, 'admin', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
    envContent.split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const [key, ...val] = line.split('=');
            return [key, val.join('=')];
        })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countJobs() {
    const { count, error } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total jobs in database: ${count}`);

    // Also fetch the first few titles to compare
    const { data: titles } = await supabase.from('jobs').select('title').limit(10);
    console.log('Job titles:', titles?.map(t => t.title).join(', '));
}

countJobs();
