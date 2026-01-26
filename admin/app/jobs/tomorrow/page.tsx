"use client";

import { JobsDashboardView } from "@/components/JobsDashboardView";
import { getJSTDateString } from "@/lib/utils";

export default function TomorrowJobsPage() {
    const tomorrowStr = getJSTDateString(1);

    return (
        <JobsDashboardView
            title="明日のダッシュボード"
            description="明日に予定されている案件のアサイン状況と準備状況を確認します。"
            targetDateStr={tomorrowStr}
        />
    );
}
