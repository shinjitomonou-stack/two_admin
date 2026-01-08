"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Download, User, Calendar, ChevronRight, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface PaymentData {
    worker_id: string;
    worker_name: string;
    total_payment: number;
    job_count: number;
}

export default function WorkerPaymentPage() {
    const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedWorker, setSelectedWorker] = useState<PaymentData | null>(null);
    const [workerDetails, setWorkerDetails] = useState<any>(null);

    const handleMoveMonth = (delta: number) => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + delta, 1);
        setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    };

    useEffect(() => {
        fetchPaymentData();
    }, [selectedMonth]);

    const fetchPaymentData = async () => {
        setIsLoading(true);
        const supabase = createClient();

        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);

        // Fetch jobs for a wider range to account for date shifts
        const queryStartDate = new Date(parseInt(year), parseInt(month) - 2, 1).toISOString().split('T')[0];
        const queryEndDate = new Date(parseInt(year), parseInt(month) + 1, 0).toISOString().split('T')[0];

        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('id, title, reward_amount, end_time, is_flexible, work_period_end, status, job_applications(worker_id, status, workers(full_name), actual_work_start, scheduled_work_start)')
            .eq('status', 'COMPLETED')
            .gte('end_time', queryStartDate)
            .lte('end_time', queryEndDate);

        if (jobsError) {
            console.error('Error fetching jobs:', jobsError);
            setIsLoading(false);
            return;
        }

        // Helper to determine the effective date
        const getEffectiveDate = (job: any, app: any) => {
            if (app.actual_work_start) return new Date(app.actual_work_start);
            if (app.scheduled_work_start) return new Date(app.scheduled_work_start);
            if (job.is_flexible && job.work_period_end) return new Date(job.work_period_end);
            return new Date(job.end_time);
        };

        // Aggregate data by worker
        const workerMap = new Map<string, PaymentData>();

        jobs?.forEach((job: any) => {
            job.job_applications?.forEach((app: any) => {
                // Only consider assigned/confirmed workers for payment
                if (app.status !== 'ASSIGNED' && app.status !== 'CONFIRMED') return;

                const effectiveDate = getEffectiveDate(job, app);
                if (effectiveDate < startDate || effectiveDate > endDate) return;

                const workerId = app.worker_id;
                if (!workerMap.has(workerId)) {
                    workerMap.set(workerId, {
                        worker_id: workerId,
                        worker_name: app.workers?.full_name || '',
                        total_payment: 0,
                        job_count: 0,
                    });
                }
                const data = workerMap.get(workerId)!;
                data.total_payment += parseFloat(job.reward_amount || 0);
                data.job_count += 1;
            });
        });

        const result = Array.from(workerMap.values());
        setPaymentData(result);
        setIsLoading(false);
    };

    const fetchWorkerDetails = async (workerId: string) => {
        const supabase = createClient();
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);

        const queryStartDate = new Date(parseInt(year), parseInt(month) - 2, 1).toISOString().split('T')[0];
        const queryEndDate = new Date(parseInt(year), parseInt(month) + 1, 0).toISOString().split('T')[0];

        // Fetch jobs and apps
        const { data: jobs } = await supabase
            .from('jobs')
            .select('*, job_applications(*)')
            .eq('status', 'COMPLETED')
            .gte('end_time', queryStartDate)
            .lte('end_time', queryEndDate);

        // Helper to determine the effective date
        const getEffectiveDate = (job: any, app: any) => {
            if (app.actual_work_start) return new Date(app.actual_work_start);
            if (app.scheduled_work_start) return new Date(app.scheduled_work_start);
            if (job.is_flexible && job.work_period_end) return new Date(job.work_period_end);
            return new Date(job.end_time);
        };

        const details: any[] = [];
        jobs?.forEach((job: any) => {
            job.job_applications?.forEach((app: any) => {
                if (app.worker_id !== workerId) return;
                if (app.status !== 'ASSIGNED' && app.status !== 'CONFIRMED') return;

                const effectiveDate = getEffectiveDate(job, app);
                if (effectiveDate >= startDate && effectiveDate <= endDate) {
                    details.push({
                        ...app,
                        jobs: job,
                        effective_date: effectiveDate
                    });
                }
            });
        });

        setWorkerDetails({ applications: details });
    };

    const handleWorkerClick = (worker: PaymentData) => {
        setSelectedWorker(worker);
        fetchWorkerDetails(worker.worker_id);
    };

    const exportToCSV = () => {
        const headers = ['ワーカー名', '案件数', '支払金額(税抜)', '消費税(10%)', '税込合計'];
        const rows = paymentData.map(data => [
            data.worker_name,
            data.job_count,
            data.total_payment,
            Math.round(data.total_payment * 0.1),
            Math.round(data.total_payment * 1.1),
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ワーカー支払集計_${selectedMonth}.csv`;
        link.click();
    };

    const grandTotal = paymentData.reduce((sum, data) => sum + data.total_payment, 0);
    const totalJobs = paymentData.reduce((sum, data) => sum + data.job_count, 0);

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">ワーカー支払金額集計</h2>
                        <p className="text-muted-foreground">
                            ワーカー別の支払金額を確認できます。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border border-input rounded-md overflow-hidden shadow-sm">
                            <button
                                onClick={() => handleMoveMonth(-1)}
                                className="p-2 hover:bg-slate-50 transition-colors border-r border-input"
                                title="前月"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="px-3 py-2 bg-transparent text-sm focus:outline-none w-[150px]"
                            />
                            <button
                                onClick={() => handleMoveMonth(1)}
                                className="p-2 hover:bg-slate-50 transition-colors border-l border-input"
                                title="翌月"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <button
                            onClick={exportToCSV}
                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            CSV出力
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">ワーカー数</div>
                        <div className="text-2xl font-bold">{paymentData.length}人</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">完了案件数</div>
                        <div className="text-2xl font-bold">{totalJobs}件</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">合計(税抜)</div>
                        <div className="text-2xl font-bold text-blue-600">¥{grandTotal.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            税込: ¥{Math.round(grandTotal * 1.1).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">ワーカー名</th>
                                    <th className="px-6 py-3 font-medium text-right">完了案件数</th>
                                    <th className="px-6 py-3 font-medium text-right">合計(税抜)</th>
                                    <th className="px-6 py-3 font-medium text-right font-bold text-slate-900">税込合計</th>
                                    <th className="px-6 py-3 font-medium text-right text-slate-400">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            読み込み中...
                                        </td>
                                    </tr>
                                ) : paymentData.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                            支払対象のデータがありません。
                                        </td>
                                    </tr>
                                ) : (
                                    paymentData.map((data) => (
                                        <tr key={data.worker_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    <span className="font-medium">{data.worker_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {data.job_count}件
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                ¥{data.total_payment.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                ¥{Math.round(data.total_payment * 1.1).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleWorkerClick(data)}
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
                                                >
                                                    詳細
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Modal */}
                {selectedWorker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedWorker(null)}>
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-border">
                                <h3 className="text-xl font-bold">{selectedWorker.worker_name} - {selectedMonth} 支払詳細</h3>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Jobs */}
                                {workerDetails?.applications && workerDetails.applications.length > 0 && (
                                    <div>
                                        <h4 className="font-bold mb-3">【完了案件】</h4>
                                        <div className="space-y-2">
                                            {workerDetails.applications.map((app: any) => (
                                                <div key={app.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                    <div>
                                                        <div className="font-medium">{app.jobs?.title}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {app.actual_work_start ? `実施日: ${new Date(app.actual_work_start).toLocaleDateString('ja-JP')}` :
                                                                app.scheduled_work_start ? `予定日: ${new Date(app.scheduled_work_start).toLocaleDateString('ja-JP')}` :
                                                                    app.jobs?.is_flexible && app.jobs?.work_period_end ? `期間終了: ${new Date(app.jobs.work_period_end).toLocaleDateString('ja-JP')}` :
                                                                        `終了日時: ${new Date(app.jobs?.end_time).toLocaleDateString('ja-JP')}`}
                                                        </div>
                                                    </div>
                                                    <div className="font-medium">¥{parseFloat(app.jobs?.reward_amount || 0).toLocaleString()}</div>
                                                </div>
                                            ))}
                                            <div className="flex flex-col items-end pt-4 border-t-2 border-slate-900 space-y-1">
                                                <div className="flex justify-between w-full text-sm">
                                                    <span className="text-muted-foreground">税抜合計</span>
                                                    <span>¥{selectedWorker.total_payment.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between w-full text-sm font-medium">
                                                    <span className="text-muted-foreground">消費税(10%)</span>
                                                    <span>¥{Math.round(selectedWorker.total_payment * 0.1).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between w-full text-lg font-bold text-blue-600 pt-1">
                                                    <span>税込合計</span>
                                                    <span>¥{Math.round(selectedWorker.total_payment * 1.1).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-border flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedWorker(null)}
                                    className="px-4 py-2 border border-input rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
