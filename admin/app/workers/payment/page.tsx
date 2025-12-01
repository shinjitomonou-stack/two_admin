"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Download, User, Calendar, ChevronRight } from "lucide-react";
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

    useEffect(() => {
        fetchPaymentData();
    }, [selectedMonth]);

    const fetchPaymentData = async () => {
        setIsLoading(true);
        const supabase = createClient();

        const [year, month] = selectedMonth.split('-');
        const startDate = `${year}-${month}-01`;
        // Get last day of the month: new Date(year, month, 0) gives last day of PREVIOUS month
        // So we need new Date(year, month + 1, 0) to get last day of current month
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        // 1. Fetch completed jobs in the period
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('id, title, reward_amount, end_time, status')
            .eq('status', 'COMPLETED')
            .gte('end_time', `${startDate}T00:00:00`)
            .lte('end_time', `${endDate}T23:59:59`);

        if (jobsError) {
            console.error('Error fetching jobs:', jobsError);
            setIsLoading(false);
            return;
        }

        if (!jobs || jobs.length === 0) {
            setPaymentData([]);
            setIsLoading(false);
            return;
        }

        const jobIds = jobs.map(j => j.id);

        // 2. Fetch assigned applications for these jobs
        const { data: applications, error: appsError } = await supabase
            .from('job_applications')
            .select(`
                job_id,
                worker_id,
                status,
                workers(full_name)
            `)
            .in('job_id', jobIds)
            .eq('status', 'ASSIGNED');

        console.log('Worker Payment Debug:', {
            selectedMonth,
            jobsCount: jobs.length,
            appsCount: applications?.length,
            appsError
        });

        // Aggregate data by worker
        const workerMap = new Map<string, PaymentData>();

        applications?.forEach((app: any) => {
            const job = jobs.find(j => j.id === app.job_id);
            if (!job) return;

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

        const result = Array.from(workerMap.values());
        setPaymentData(result);
        setIsLoading(false);
    };

    const fetchWorkerDetails = async (workerId: string) => {
        const supabase = createClient();
        const [year, month] = selectedMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        // 1. Fetch completed jobs for the period
        const { data: jobs } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'COMPLETED')
            .gte('end_time', `${startDate}T00:00:00`)
            .lte('end_time', `${endDate}T23:59:59`);

        if (!jobs || jobs.length === 0) {
            setWorkerDetails({ applications: [] });
            return;
        }

        const jobIds = jobs.map(j => j.id);

        // 2. Fetch assigned applications for this worker and these jobs
        const { data: apps } = await supabase
            .from('job_applications')
            .select('*')
            .eq('worker_id', workerId)
            .eq('status', 'ASSIGNED')
            .in('job_id', jobIds);

        const applications = apps?.map((app: any) => ({
            ...app,
            jobs: jobs.find(j => j.id === app.job_id)
        })) || [];

        setWorkerDetails({ applications });
    };

    const handleWorkerClick = (worker: PaymentData) => {
        setSelectedWorker(worker);
        fetchWorkerDetails(worker.worker_id);
    };

    const exportToCSV = () => {
        const headers = ['ワーカー名', '案件数', '支払金額'];
        const rows = paymentData.map(data => [
            data.worker_name,
            data.job_count,
            data.total_payment.toLocaleString(),
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
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
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
                        <div className="text-sm text-muted-foreground mb-1">支払総額</div>
                        <div className="text-2xl font-bold text-blue-600">¥{grandTotal.toLocaleString()}</div>
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
                                    <th className="px-6 py-3 font-medium text-right">支払金額</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
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
                                            <td className="px-6 py-4 text-right font-medium text-blue-600">
                                                ¥{data.total_payment.toLocaleString()}
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
                                                            {new Date(app.jobs?.end_time).toLocaleDateString('ja-JP')}
                                                        </div>
                                                    </div>
                                                    <div className="font-medium">¥{parseFloat(app.jobs?.reward_amount || 0).toLocaleString()}</div>
                                                </div>
                                            ))}
                                            <div className="flex justify-end pt-2 border-t border-border">
                                                <span className="font-medium">合計: ¥{selectedWorker.total_payment.toLocaleString()}</span>
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
