"use client";

import { JobsDashboardView } from "@/components/JobsDashboardView";
import { getJSTDateString } from "@/lib/utils";

export default function TodayJobsPage() {
    const todayStr = getJSTDateString(0);

    return (
        <JobsDashboardView
            title="本日のダッシュボード"
            description="本日に予定されている案件の稼働状況を確認します。"
            targetDateStr={todayStr}
        />
    );
}
