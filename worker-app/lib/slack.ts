/**
 * Utility to send Slack notifications via Webhook.
 * This MUST be run on the server to access non-public environment variables.
 */
export async function sendSlackNotification(message: string) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error("CRITICAL: SLACK_WEBHOOK_URL is not defined in environment variables.");
        return { success: false, error: "SLACK_WEBHOOK_URL_MISSING" };
    }

    try {
        console.log(`Sending Slack notification: ${message.substring(0, 50)}...`);
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: message,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Slack notification failed:", errorText);
            return { success: false, error: errorText };
        }

        return { success: true };
    } catch (error) {
        console.error("Error sending Slack notification:", error);
        return { success: false, error };
    }
}
