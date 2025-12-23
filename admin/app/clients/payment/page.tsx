"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { Download, Building2, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface PaymentData {
    client_id: string;
    client_name: string;
    spot_payment: number;
    recurring_payment: number;
    total_payment: number;
    contract_count: number;
}

export default function ClientPaymentPage() {
    const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedClient, setSelectedClient] = useState<PaymentData | null>(null);
    const [clientDetails, setClientDetails] = useState<any>(null);

    useEffect(() => {
        fetchPaymentData();
    }, [selectedMonth]);

    const fetchPaymentData = async () => {
        setIsLoading(true);
        const supabase = createClient();

        const [year, month] = selectedMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

        // Fetch all PLACING contracts relevant to the period
        // We fetch a bit broadly and filter in JS to be safe with the OR logic for dates if needed,
        // but SQL filtering is more efficient.
        // Logic:
        // 1. Spot (ONCE): start_date in month
        // 2. Recurring: Active during month (start <= EOM AND (end IS NULL OR end >= SOM))

        const { data: contracts, error } = await supabase
            .from('client_job_contracts')
            .select('*, clients(name)')
            .eq('trading_type', 'PLACING')
            .lte('start_date', endDate) // Contract must have started by end of month
            .or(`end_date.is.null,end_date.gte.${startDate}`); // Contract ends after start of month or is indefinite

        if (error) {
            console.error('Error fetching contracts:', error);
            setIsLoading(false);
            return;
        }

        // Aggregate data by client
        const clientMap = new Map<string, PaymentData>();

        contracts?.forEach((contract: any) => {
            // Filter strictly in JS to be sure about the logic, especially for ONCE
            const isOnce = contract.billing_cycle === 'ONCE';
            const contractStart = contract.start_date;

            // For ONCE, rigorous check: start_date must be in the selected month
            if (isOnce) {
                if (contractStart < startDate || contractStart > endDate) {
                    return;
                }
            }

            const clientId = contract.client_id;
            if (!clientMap.has(clientId)) {
                clientMap.set(clientId, {
                    client_id: clientId,
                    client_name: contract.clients?.name || '',
                    spot_payment: 0,
                    recurring_payment: 0,
                    total_payment: 0,
                    contract_count: 0,
                });
            }

            const data = clientMap.get(clientId)!;
            const amount = parseFloat(contract.contract_amount || 0);

            if (isOnce) {
                data.spot_payment += amount;
            } else {
                data.recurring_payment += amount;
            }
            data.contract_count += 1;
        });

        // Calculate totals
        const result = Array.from(clientMap.values()).map(data => ({
            ...data,
            total_payment: data.spot_payment + data.recurring_payment,
        }));

        setPaymentData(result);
        setIsLoading(false);
    };

    const fetchClientDetails = async (clientId: string) => {
        // Reuse the logic from fetchPaymentData but filtered by client
        // Optimizing by passing data would be better but separate fetch is simpler for now
        const supabase = createClient();
        const [year, month] = selectedMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

        const { data: contracts } = await supabase
            .from('client_job_contracts')
            .select('*, jobs(title)')
            .eq('trading_type', 'PLACING')
            .eq('client_id', clientId)
            .lte('start_date', endDate)
            .or(`end_date.is.null,end_date.gte.${startDate}`);

        // Filter ONCE contracts again
        const filteredContracts = contracts?.filter((c: any) => {
            if (c.billing_cycle === 'ONCE') {
                return c.start_date >= startDate && c.start_date <= endDate;
            }
            return true;
        });

        setClientDetails({ contracts: filteredContracts });
    };

    const handleClientClick = (client: PaymentData) => {
        setSelectedClient(client);
        fetchClientDetails(client.client_id);
    };

    const exportToCSV = () => {
        const headers = ['クライアント名', 'スポット支払(都度)', '月額支払(継続)', '合計(税抜)', '消費税(10%)', '税込合計'];
        const rows = paymentData.map(data => [
            data.client_name,
            data.spot_payment.toLocaleString(),
            data.recurring_payment.toLocaleString(),
            data.total_payment.toLocaleString(),
            Math.floor(data.total_payment * 0.1).toLocaleString(),
            Math.floor(data.total_payment * 1.1).toLocaleString(),
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `支払金額集計_${selectedMonth}.csv`;
        link.click();
    };

    const totalSpotPayment = paymentData.reduce((sum, data) => sum + data.spot_payment, 0);
    const totalRecurringPayment = paymentData.reduce((sum, data) => sum + data.recurring_payment, 0);
    const grandTotal = totalSpotPayment + totalRecurringPayment;

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">クライアント支払金額集計</h2>
                        <p className="text-muted-foreground">
                            クライアント別の支払金額（発注契約）を確認できます。
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
                        <div className="text-sm text-muted-foreground mb-1">スポット支払 (都度)</div>
                        <div className="text-2xl font-bold">¥{totalSpotPayment.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                        <div className="text-sm text-muted-foreground mb-1">月額支払 (継続)</div>
                        <div className="text-2xl font-bold">¥{totalRecurringPayment.toLocaleString()}</div>
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
                                    <th className="px-6 py-3 font-medium text-right">スポット支払</th>
                                    <th className="px-6 py-3 font-medium text-right">月額支払</th>
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
                                ) : paymentData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                            支払対象のデータがありません。
                                        </td>
                                    </tr>
                                ) : (
                                    paymentData.map((data) => (
                                        <tr key={data.client_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                    <span className="font-medium">{data.client_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                ¥{data.spot_payment.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                ¥{data.recurring_payment.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">
                                                ¥{data.total_payment.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-blue-600 font-medium">
                                                ¥{Math.floor(data.total_payment * 1.1).toLocaleString()}
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
                                <h3 className="text-xl font-bold">{selectedClient.client_name} - {selectedMonth} 支払詳細</h3>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Contracts List */}
                                {clientDetails?.contracts && clientDetails.contracts.length > 0 ? (
                                    <div>
                                        <h4 className="font-bold mb-3">【対象契約一覧】</h4>
                                        <div className="space-y-2">
                                            {clientDetails.contracts.map((contract: any) => (
                                                <div key={contract.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                    <div>
                                                        <div className="font-medium">{contract.title}</div>
                                                        <div className="text-xs text-muted-foreground flex gap-2">
                                                            <span className={contract.billing_cycle === 'ONCE' ? 'text-orange-600 font-bold' : 'text-blue-600'}>
                                                                {contract.billing_cycle === 'ONCE' ? 'スポット(ONCE)' :
                                                                    contract.billing_cycle === 'MONTHLY' ? '月次' :
                                                                        contract.billing_cycle === 'QUARTERLY' ? '四半期' :
                                                                            contract.billing_cycle === 'YEARLY' ? '年次' : contract.billing_cycle}
                                                            </span>
                                                            <span>
                                                                {contract.jobs?.title && `案件: ${contract.jobs.title}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="font-medium">¥{parseFloat(contract.contract_amount || 0).toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground">詳細データがありません</div>
                                )}

                                {/* Total */}
                                <div className="border-t-2 border-slate-900 pt-4 space-y-2">
                                    <div className="flex justify-between text-lg">
                                        <span className="font-medium">税抜合計</span>
                                        <span className="font-bold">¥{selectedClient.total_payment.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>消費税(10%)</span>
                                        <span>¥{Math.floor(selectedClient.total_payment * 0.1).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xl text-blue-600">
                                        <span className="font-bold">税込合計</span>
                                        <span className="font-bold">¥{Math.floor(selectedClient.total_payment * 1.1).toLocaleString()}</span>
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
