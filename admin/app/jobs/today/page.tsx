"use client";

import { JobsDashboardView } from "@/components/JobsDashboardView";

export default function TodayJobsPage() {
    const today = new Date();

    return (
        <JobsDashboardView
            title="本日のダッシュボード"
            description="本日に予定されている案件の稼働状況を確認します。"
            targetDate={today}
        />
    );
}
