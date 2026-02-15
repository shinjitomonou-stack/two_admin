import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        const workerId = user?.id;

        if (!workerId) {
            return NextResponse.json(
                { message: "認証されていません" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { applicationId, workStart, workEnd, reportText, photoUrls, customFields, reportId } = body;

        if (!applicationId || !workStart || !workEnd || !reportText) {
            return NextResponse.json(
                { message: "必須項目が不足しています" },
                { status: 400 }
            );
        }

        // Verify application belongs to worker
        const { data: application, error: appError } = await supabase
            .from("job_applications")
            .select("id, job_id")
            .eq("id", applicationId)
            .eq("worker_id", workerId)
            .single();

        if (appError || !application) {
            return NextResponse.json(
                { message: "応募情報が見つかりません" },
                { status: 404 }
            );
        }

        if (reportId) {
            // Update existing rejected report (resubmission)
            const { error: updateError } = await supabase
                .from("reports")
                .update({
                    work_start_at: workStart,
                    work_end_at: workEnd,
                    report_text: reportText,
                    photo_urls: photoUrls,
                    custom_fields: customFields,
                    status: "SUBMITTED",
                    feedback: null, // Clear previous feedback
                })
                .eq("id", reportId)
                .eq("application_id", applicationId);

            if (updateError) {
                console.error("Report update error:", updateError);
                throw updateError;
            }
        } else {
            // Insert new report
            const { error: reportError } = await supabase
                .from("reports")
                .insert({
                    application_id: applicationId,
                    work_start_at: workStart,
                    work_end_at: workEnd,
                    report_text: reportText,
                    photo_urls: photoUrls,
                    custom_fields: customFields,
                    status: "SUBMITTED",
                });

            if (reportError) {
                console.error("Report insert error:", reportError);
                throw reportError;
            }
        }

        // Update actual work dates in job_applications
        const { error: updateError } = await supabase
            .from("job_applications")
            .update({
                actual_work_start: workStart,
                actual_work_end: workEnd,
            })
            .eq("id", applicationId);

        if (updateError) {
            console.error("Application update error:", updateError);
            // Don't fail the request if only this update fails, but log it
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json(
            { message: "サーバーエラーが発生しました" },
            { status: 500 }
        );
    }
}
