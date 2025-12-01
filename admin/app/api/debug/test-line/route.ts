import { NextResponse } from "next/server";
import { sendLineMessage } from "@/lib/line";

export async function GET() {
    const targetUserId = "U6b9c0f18b382123f996982a4af358fc7"; // 友納信治さんのID

    try {
        await sendLineMessage(targetUserId, "【テスト通知】\nこれはTeo Workからのテスト通知です。\n\n正常に連携されています！🎉");
        return NextResponse.json({ success: true, message: "Notification sent" });
    } catch (error) {
        console.error("Failed to send test message:", error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}
