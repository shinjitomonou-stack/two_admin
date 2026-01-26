"use client";

/**
 * Utility to send Slack notifications via Webhook.
 * This can be used from both client and server components (if used in server actions).
 * For server actions, use the server-side fetch.
 */
export async function sendSlackNotification(message: string) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn("SLACK_WEBHOOK_URL is not defined. Skipping notification.");
        return { success: false, error: "SLACK_WEBHOOK_URL_MISSING" };
    }

    try {
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
