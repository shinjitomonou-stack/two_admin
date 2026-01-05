"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Download, FileText, Building2, Calendar, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface BillingData {
    client_id: string;
    client_name: string;
    job_billing: number;
    monthly_billing: number;
    total_billing: number;
    job_count: number;
}

export default function ClientBillingPage() {
    const [billingData, setBillingData] = useState<BillingData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedClient, setSelectedClient] = useState<BillingData | null>(null);
    const [clientDetails, setClientDetails] = useState<any>(null);

    useEffect(() => {
        fetchBillingData();
    }, [selectedMonth]);

    const fetchBillingData = async () => {
        setIsLoading(true);
        const supabase = createClient();

        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch jobs with applications to check actual/scheduled dates
        // We fetch a wider range of jobs to account for dates shifting between months
        const queryStartDate = new Date(parseInt(year), parseInt(month) - 2, 1).toISOString().split('T')[0];
        const queryEndDate = new Date(parseInt(year), parseInt(month) + 1, 0).toISOString().split('T')[0];

        const { data: jobs } = await supabase
            .from('jobs')
            .select('*, clients(name), job_applications(actual_work_start, scheduled_work_start)')
            .eq('status', 'COMPLETED')
            .gte('end_time', queryStartDate)
            .lte('end_time', queryEndDate);

        // Fetch monthly and one-time independent contract billing
        const { data: contractBilling } = await supabase
            .from('client_job_contracts')
            .select('client_id, contract_amount, billing_cycle, start_date, clients(name)')
            .eq('trading_type', 'RECEIVING')
            .lte('start_date', endDateStr)
            .or(`end_date.is.null,end_date.gte.${startDateStr}`);

        // Helper to determine the effective billing date for a job
        const getEffectiveDate = (job: any) => {
            const apps = job.job_applications || [];
            // Priority 1: Actual Work Date
            const actual = apps.find((a: any) => a.actual_work_start)?.actual_work_start;
            if (actual) return new Date(actual);

            // Priority 2: Scheduled Work Date
            const scheduled = apps.find((a: any) => a.scheduled_work_start)?.scheduled_work_start;
            if (scheduled) return new Date(scheduled);

            // Priority 3: Job Period End or End Time
            if (job.is_flexible && job.work_period_end) return new Date(job.work_period_end);
            return new Date(job.end_time);
        };

        // Aggregate data by client
        const clientMap = new Map<string, BillingData>();

        jobs?.forEach((job: any) => {
            const effectiveDate = getEffectiveDate(job);

            // Filter by selected month using the effective date
            if (effectiveDate < startDate || effectiveDate > endDate) return;

            const clientId = job.client_id;
            if (!clientMap.has(clientId)) {
                clientMap.set(clientId, {
                    client_id: clientId,
                    client_name: job.clients?.name || '',
                    job_billing: 0,
                    monthly_billing: 0,
                    total_billing: 0,
                    job_count: 0,
                });
            }
            const data = clientMap.get(clientId)!;
            data.job_billing += parseFloat(job.billing_amount || 0);
            data.job_count += 1;
        });

        contractBilling?.forEach((contract: any) => {
            const clientId = contract.client_id;
            if (!clientMap.has(clientId)) {
                clientMap.set(clientId, {
                    client_id: clientId,
                    client_name: contract.clients?.name || '',
                    job_billing: 0,
                    monthly_billing: 0,
                    total_billing: 0,
                    job_count: 0,
                });
            }
            const data = clientMap.get(clientId)!;

            // For 'ONCE' contracts, only include if start_date is in the currently selected month
            if (contract.billing_cycle === 'ONCE') {
                const contractStartDate = new Date(contract.start_date);
                if (contractStartDate < startDate || contractStartDate > endDate) return;
            }

            data.monthly_billing += parseFloat(contract.contract_amount || 0);
        });

        // Calculate totals
        const result = Array.from(clientMap.values()).map(data => ({
            ...data,
            total_billing: data.job_billing + data.monthly_billing,
        }));

        setBillingData(result);
        setIsLoading(false);
    };

    const fetchClientDetails = async (clientId: string) => {
        const supabase = createClient();
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch jobs for this client (wider range for shifts)
        const queryStartDate = new Date(parseInt(year), parseInt(month) - 2, 1).toISOString().split('T')[0];
        const queryEndDate = new Date(parseInt(year), parseInt(month) + 1, 0).toISOString().split('T')[0];

        const { data: allJobs } = await supabase
            .from('jobs')
            .select('*, job_applications(actual_work_start, scheduled_work_start)')
            .eq('client_id', clientId)
            .eq('status', 'COMPLETED')
            .gte('end_time', queryStartDate)
            .lte('end_time', queryEndDate);

        // Helper to determine the effective billing date for a job
        const getEffectiveDate = (job: any) => {
            const apps = job.job_applications || [];
            const actual = apps.find((a: any) => a.actual_work_start)?.actual_work_start;
            if (actual) return new Date(actual);
            const scheduled = apps.find((a: any) => a.scheduled_work_start)?.scheduled_work_start;
            if (scheduled) return new Date(scheduled);
            if (job.is_flexible && job.work_period_end) return new Date(job.work_period_end);
            return new Date(job.end_time);
        };

        const filteredJobs = allJobs?.filter(job => {
            const effectiveDate = getEffectiveDate(job);
            return effectiveDate >= startDate && effectiveDate <= endDate;
        }) || [];

        // Fetch contracts (both recurring active and one-time in this month)
        const { data: allContracts } = await supabase
            .from('client_job_contracts')
            .select('*')
            .eq('client_id', clientId)
            .eq('trading_type', 'RECEIVING')
            .lte('start_date', endDateStr)
            .or(`end_date.is.null,end_date.gte.${startDateStr}`);

        const filteredContracts = allContracts?.filter(contract => {
            if (contract.billing_cycle === 'ONCE') {
                const contractStartDate = new Date(contract.start_date);
                return contractStartDate >= startDate && contractStartDate <= endDate;
            }
            return true; // Recurring active contracts are already filtered by SQL query
        }) || [];

        setClientDetails({ jobs: filteredJobs, contracts: filteredContracts });
    };

    const handleClientClick = (client: BillingData) => {
        setSelectedClient(client);
        fetchClientDetails(client.client_id);
    };

    const exportToCSV = () => {
        const headers = ['クライアント名', '案件請求', '月額請求', '合計(税抜)', '消費税(10%)', '税込合計'];
        const rows = billingData.map(data => [
            data.client_name,
            data.job_billing.toLocaleString(),
            data.monthly_billing.toLocaleString(),
            data.total_billing.toLocaleString(),
            Math.floor(data.total_billing * 0.1).toLocaleString(),
            Math.floor(data.total_billing * 1.1).toLocaleString(),
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `請求金額集計_${selectedMonth}.csv`;
        link.click();
    };

    const totalJobBilling = billingData.reduce((sum, data) => sum + data.job_billing, 0);
    const totalMonthlyBilling = billingData.reduce((sum, data) => sum + data.monthly_billing, 0);
    const grandTotal = totalJobBilling + totalMonthlyBilling;

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">クライアント請求金額集計</h2>
                        <p className="text-muted-foreground">
                            クライアント別の請求金額を確認できます。
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
                        <div className="text-sm text-muted-foreground mb-1">案件請求</div>
                        <div className="text-2xl font-bold">¥{totalJobBilling.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">月額請求</div>
                        <div className="text-2xl font-bold">¥{totalMonthlyBilling.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">合計(税抜)</div>
                        <div className="text-2xl font-bold text-blue-600">¥{grandTotal.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            税込: ¥{Math.floor(grandTotal * 1.1).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">クライアント名</th>
                                    <th className="px-6 py-3 font-medium text-right">案件請求</th>
                                    <th className="px-6 py-3 font-medium text-right">月額請求</th>
                                    <th className="px-6 py-3 font-medium text-right">合計(税抜)</th>
                                    <th className="px-6 py-3 font-medium text-right">税込合計</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            読み込み中...
                                        </td>
                                    </tr>
                                ) : billingData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            請求対象のデータがありません。
                                        </td>
                                    </tr>
                                ) : (
                                    billingData.map((data) => (
                                        <tr key={data.client_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                    <span className="font-medium">{data.client_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                ¥{data.job_billing.toLocaleString()}
                                                {data.job_count > 0 && (
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        ({data.job_count}件)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                ¥{data.monthly_billing.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">
                                                ¥{data.total_billing.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-blue-600 font-medium">
                                                ¥{Math.floor(data.total_billing * 1.1).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleClientClick(data)}
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
                {selectedClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedClient(null)}>
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 border-b border-border">
                                <h3 className="text-xl font-bold">{selectedClient.client_name} - {selectedMonth} 請求詳細</h3>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Jobs */}
                                {clientDetails?.jobs && clientDetails.jobs.length > 0 && (
                                    <div>
                                        <h4 className="font-bold mb-3">【案件ベース】</h4>
                                        <div className="space-y-2">
                                            {clientDetails.jobs.map((job: any) => (
                                                <div key={job.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                    <div>
                                                        <div className="font-medium">{job.title}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {(() => {
                                                                const apps = job.job_applications || [];
                                                                const actual = apps.find((a: any) => a.actual_work_start)?.actual_work_start;
                                                                if (actual) return `実施日: ${new Date(actual).toLocaleDateString('ja-JP')}`;
                                                                const scheduled = apps.find((a: any) => a.scheduled_work_start)?.scheduled_work_start;
                                                                if (scheduled) return `予定日: ${new Date(scheduled).toLocaleDateString('ja-JP')}`;
                                                                if (job.is_flexible && job.work_period_end) return `期間終了: ${new Date(job.work_period_end).toLocaleDateString('ja-JP')}`;
                                                                return `終了日時: ${new Date(job.end_time).toLocaleDateString('ja-JP')}`;
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div className="font-medium">¥{parseFloat(job.billing_amount || 0).toLocaleString()}</div>
                                                </div>
                                            ))}
                                            <div className="flex justify-end pt-2 border-t border-border">
                                                <span className="font-medium">小計: ¥{selectedClient.job_billing.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Contracts */}
                                {clientDetails?.contracts && clientDetails.contracts.length > 0 && (
                                    <div>
                                        <h4 className="font-bold mb-3">【月額契約】</h4>
                                        <div className="space-y-2">
                                            {clientDetails.contracts.map((contract: any) => (
                                                <div key={contract.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                    <div>
                                                        <div className="font-medium">{contract.title}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {contract.billing_cycle === 'MONTHLY' ? '月次' :
                                                                contract.billing_cycle === 'QUARTERLY' ? '四半期' :
                                                                    contract.billing_cycle === 'YEARLY' ? '年次' : '継続'}
                                                        </div>
                                                    </div>
                                                    <div className="font-medium">¥{parseFloat(contract.contract_amount || 0).toLocaleString()}</div>
                                                </div>
                                            ))}
                                            <div className="flex justify-end pt-2 border-t border-border">
                                                <span className="font-medium">小計: ¥{selectedClient.monthly_billing.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Total */}
                                <div className="border-t-2 border-slate-900 pt-4 space-y-2">
                                    <div className="flex justify-between text-lg">
                                        <span className="font-medium">税抜合計</span>
                                        <span className="font-bold">¥{selectedClient.total_billing.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>消費税(10%)</span>
                                        <span>¥{Math.floor(selectedClient.total_billing * 0.1).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xl text-blue-600">
                                        <span className="font-bold">税込合計</span>
                                        <span className="font-bold">¥{Math.floor(selectedClient.total_billing * 1.1).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-border flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedClient(null)}
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
