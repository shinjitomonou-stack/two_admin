"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [id, setId] = useState<string | null>(null);
    const [templates, setTemplates] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        reward_amount: 0,
        billing_amount: 0,
        max_workers: 1,
        start_time: "",
        end_time: "",
        address_text: "",
        status: "DRAFT",
        is_flexible: false,
        work_period_start: "",
        work_period_end: "",
        schedule_notes: "",
        report_template_id: "",
        // New fields
        reward_type: "FIXED",
        reward_unit_price: 0,
        billing_unit_price: 0,
        reward_quantity: 0,
    });

    useEffect(() => {
        const fetchJob = async () => {
            const resolvedParams = await params;
            setId(resolvedParams.id);

            const supabase = createClient();
            const { data, error } = await supabase
                .from("jobs")
                .select("*")
                .eq("id", resolvedParams.id)
                .single();

            if (error) {
                console.error(error);
                alert("案件の取得に失敗しました");
                router.push("/jobs");
                return;
            }

            // Fetch templates
            const { data: templatesData } = await supabase
                .from("report_templates")
                .select("id, name")
                .eq("is_active", true)
                .order("name");
            if (templatesData) setTemplates(templatesData);

            if (data) {
                // Format dates for datetime-local input
                const formatDateTime = (dateStr: string) => {
                    if (!dateStr) return "";
                    const date = new Date(dateStr);
                    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                };

                setFormData({
                    title: data.title,
                    description: data.description || "",
                    reward_amount: data.reward_amount,
                    billing_amount: data.billing_amount || 0,
                    max_workers: data.max_workers || 1,
                    start_time: formatDateTime(data.start_time),
                    end_time: formatDateTime(data.end_time),
                    address_text: data.address_text || "",
                    status: data.status,
                    is_flexible: data.is_flexible || false,
                    work_period_start: data.work_period_start ? formatDateTime(data.work_period_start) : "",
                    work_period_end: data.work_period_end ? formatDateTime(data.work_period_end) : "",
                    schedule_notes: data.schedule_notes || "",
                    report_template_id: data.report_template_id || "",
                    // New fields
                    reward_type: data.reward_type || "FIXED",
                    reward_unit_price: data.reward_unit_price || 0,
                    billing_unit_price: data.billing_unit_price || 0,
                    reward_quantity: data.reward_quantity || 0,
                });
            }
            setIsFetching(false);
        };

        fetchJob();
    }, [params, router]);

    // Recalculate totals when unit/qty changes
    useEffect(() => {
        if (!isFetching && formData.reward_type === 'UNIT') {
            const unitPrice = parseFloat(formData.reward_unit_price.toString()) || 0;
            const billingUnitPrice = parseFloat(formData.billing_unit_price.toString()) || 0;
            const quantity = parseInt(formData.reward_quantity.toString()) || 0;

            // Avoid infinite loop by only updating if values are different
            const newReward = Math.round(unitPrice * quantity);
            const newBilling = Math.round(billingUnitPrice * quantity);

            if (newReward !== formData.reward_amount || (newBilling > 0 && newBilling !== formData.billing_amount)) {
                setFormData(prev => ({
                    ...prev,
                    reward_amount: newReward,
                    billing_amount: newBilling > 0 ? newBilling : prev.billing_amount
                }));
            }
        }
    }, [formData.reward_type, formData.reward_unit_price, formData.billing_unit_price, formData.reward_quantity, isFetching]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        try {
            const { error } = await supabase
                .from("jobs")
                .update({
                    ...formData,
                    // Parse values
                    reward_amount: Math.round(Number(formData.reward_amount)),
                    billing_amount: Math.round(Number(formData.billing_amount)),
                    max_workers: parseInt(String(formData.max_workers)),

                    reward_unit_price: formData.reward_type === 'UNIT' ? parseFloat(String(formData.reward_unit_price)) : null,
                    billing_unit_price: formData.reward_type === 'UNIT' ? parseFloat(String(formData.billing_unit_price)) : null,
                    reward_quantity: formData.reward_type === 'UNIT' ? parseInt(String(formData.reward_quantity)) : null,

                    start_time: new Date(formData.start_time).toISOString(),
                    end_time: new Date(formData.end_time).toISOString(),
                    work_period_start: formData.work_period_start ? new Date(formData.work_period_start).toISOString() : null,
                    work_period_end: formData.work_period_end ? new Date(formData.work_period_end).toISOString() : null,
                    report_template_id: formData.report_template_id || null,
                })
                .eq("id", id);

            if (error) throw error;

            alert("保存しました");
            router.push(`/jobs/${id}`);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(`エラーが発生しました: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/jobs/${id}`}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">案件編集</h2>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        保存する
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">案件タイトル <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">業務内容</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[150px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">募集人数 <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.max_workers}
                                onChange={(e) => setFormData({ ...formData, max_workers: Number(e.target.value) })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">報酬設定タイプ</label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="reward_type"
                                                value="FIXED"
                                                checked={formData.reward_type === "FIXED"}
                                                onChange={(e) => setFormData({ ...formData, reward_type: "FIXED" })}
                                                className="w-4 h-4 text-slate-900 focus:ring-slate-500"
                                            />
                                            <span className="text-sm">固定金額（総額）</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="reward_type"
                                                value="UNIT"
                                                checked={formData.reward_type === "UNIT"}
                                                onChange={(e) => setFormData({ ...formData, reward_type: "UNIT" })}
                                                className="w-4 h-4 text-slate-900 focus:ring-slate-500"
                                            />
                                            <span className="text-sm">単価 × 数量</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.reward_type === "UNIT" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">数量 <span className="text-red-500">*</span></label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.reward_quantity}
                                                onChange={(e) => setFormData({ ...formData, reward_quantity: Number(e.target.value) })}
                                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">報酬単価 <span className="text-red-500">*</span></label>
                                            <input
                                                type="number"
                                                step="any"
                                                required
                                                value={formData.reward_unit_price}
                                                onChange={(e) => setFormData({ ...formData, reward_unit_price: Number(e.target.value) })}
                                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">請求単価</label>
                                            <input
                                                type="number"
                                                step="any"
                                                value={formData.billing_unit_price}
                                                onChange={(e) => setFormData({ ...formData, billing_unit_price: Number(e.target.value) })}
                                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">報酬金額（1人あたり・円） <span className="text-red-500">*</span></label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={formData.reward_amount}
                                                onChange={(e) => setFormData({ ...formData, reward_amount: Number(e.target.value) })}
                                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">請求金額（1人あたり・円）</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.billing_amount}
                                                onChange={(e) => setFormData({ ...formData, billing_amount: Number(e.target.value) })}
                                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">作業報告テンプレート</label>
                            <select
                                value={formData.report_template_id}
                                onChange={(e) => setFormData({ ...formData, report_template_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="">テンプレートなし（デフォルト）</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>{template.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Calculations */}
                    {formData.reward_amount > 0 && formData.max_workers > 0 && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="text-sm font-semibold mb-3 text-slate-700">見積</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">総報酬額:</span>
                                    <span className="font-semibold">
                                        ¥{(formData.reward_amount * formData.max_workers).toLocaleString()}
                                    </span>
                                </div>
                                {formData.billing_amount > 0 && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">総請求額:</span>
                                            <span className="font-semibold">
                                                ¥{(formData.billing_amount * formData.max_workers).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-slate-300">
                                            <span className="text-slate-600">粗利:</span>
                                            <span className="font-semibold text-green-600">
                                                ¥{((formData.billing_amount - formData.reward_amount) * formData.max_workers).toLocaleString()}
                                                {' '}
                                                ({Math.round(((formData.billing_amount - formData.reward_amount) / formData.billing_amount) * 100)}%)
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <input
                                type="checkbox"
                                id="is_flexible"
                                checked={formData.is_flexible}
                                onChange={(e) => setFormData({ ...formData, is_flexible: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="is_flexible" className="text-sm font-medium cursor-pointer">
                                期間指定（好きな日時で実施）
                            </label>
                        </div>

                        {formData.is_flexible ? (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">期間開始 <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.work_period_start}
                                        onChange={(e) => setFormData({ ...formData, work_period_start: e.target.value })}
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">期間終了 <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.work_period_end}
                                        onChange={(e) => setFormData({ ...formData, work_period_end: e.target.value })}
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">開始日時 <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">終了日時 <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 mt-4">
                            <label className="text-sm font-medium">日時に関する備考</label>
                            <textarea
                                value={formData.schedule_notes}
                                onChange={(e) => setFormData({ ...formData, schedule_notes: e.target.value })}
                                placeholder="例：当日の天候により開始時刻が変更になる可能性があります"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[80px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                ワーカーに表示される日時に関する注意事項や備考を入力できます。
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">勤務地住所</label>
                        <input
                            type="text"
                            value={formData.address_text}
                            onChange={(e) => setFormData({ ...formData, address_text: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">ステータス</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            <option value="DRAFT">下書き (DRAFT)</option>
                            <option value="OPEN">募集中 (OPEN)</option>
                            <option value="IN_PROGRESS">進行中 (IN_PROGRESS)</option>
                            <option value="COMPLETED">完了 (COMPLETED)</option>
                            <option value="CANCELLED">キャンセル (CANCELLED)</option>
                        </select>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
