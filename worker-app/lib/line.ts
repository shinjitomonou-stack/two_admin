const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

export async function sendLineMessage(userId: string, text: string) {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
        console.warn("LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping LINE notification.");
        return { success: false, error: "LINE_CHANNEL_ACCESS_TOKEN not set" };
    }

    if (!userId) {
        console.warn("No LINE User ID provided. Skipping LINE notification.");
        return { success: false, error: "No User ID" };
    }

    try {
        const response = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                to: userId,
                messages: [
                    {
                        type: "text",
                        text: text,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error sending LINE message:", errorData);
            return { success: false, error: errorData };
        }

        return { success: true };
    } catch (error) {
        console.error("Error sending LINE message:", error);
        return { success: false, error };
    }
}
