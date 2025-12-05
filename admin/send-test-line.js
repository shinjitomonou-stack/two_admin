const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const WORKER_ID = 'b6376062-1f5d-4a2c-98bc-337dcb8f98f1';

async function main() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !LINE_CHANNEL_ACCESS_TOKEN) {
        console.error('Missing environment variables');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log(`Fetching worker with ID: ${WORKER_ID}`);
    const { data: worker, error } = await supabase
        .from('workers')
        .select('full_name, line_user_id')
        .eq('id', WORKER_ID)
        .single();

    if (error) {
        console.error('Error fetching worker:', error);
        process.exit(1);
    }

    if (!worker) {
        console.error('Worker not found');
        process.exit(1);
    }

    console.log(`Found worker: ${worker.full_name}`);
    console.log(`LINE User ID: ${worker.line_user_id || 'Not set'}`);

    if (!worker.line_user_id) {
        console.error('Worker does not have a LINE User ID linked.');
        process.exit(1);
    }

    console.log('Sending test message...');
    const message = `【テスト送信】\n\n${worker.full_name}さん\n\nこれは管理者からのテストメッセージです。\nこのメッセージが届いていれば、LINE連携は正常に動作しています。`;

    try {
        const response = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                to: worker.line_user_id,
                messages: [
                    {
                        type: "text",
                        text: message,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error sending LINE message:", JSON.stringify(errorData, null, 2));
            process.exit(1);
        }

        console.log("Test message sent successfully!");
    } catch (error) {
        console.error("Error sending LINE message:", error);
        process.exit(1);
    }
}

main();
