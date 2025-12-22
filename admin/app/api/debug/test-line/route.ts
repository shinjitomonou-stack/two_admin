import { NextResponse } from "next/server";
import { sendLineMessage } from "@/lib/line";

import { verifyAdmin } from "@/lib/auth";

export async function GET() {
    try {
        await verifyAdmin();
        const targetUserId = "U6b9c0f18b382123f996982a4af358fc7"; // 友納信治さんのID

        try {
            await sendLineMessage(targetUserId, "【テスト通知】\nこれはTeo Workからのテスト通知です。\n\n正常に連携されています！🎉");
            return NextResponse.json({ success: true, message: "Notification sent" });
        } catch (error) {
            console.error("Failed to send test message:", error);
            return NextResponse.json({ success: false, error }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Debug API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
}
