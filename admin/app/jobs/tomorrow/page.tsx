"use client";

import { JobsDashboardView } from "@/components/JobsDashboardView";

export default function TomorrowJobsPage() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (
        <JobsDashboardView
            title="明日のダッシュボード"
            description="明日に予定されている案件のアサイン状況と準備状況を確認します。"
            targetDate={tomorrow}
        />
    );
}
