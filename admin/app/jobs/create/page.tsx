"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, MapPin, Calendar, Clock, Banknote, Building2, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function CreateJobPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const router = useRouter();
    const supabase = createClient();

    // Form States
    const [formData, setFormData] = useState({
        title: "",
        clientId: "",
        description: "",
        address: "",
        latitude: "",
        longitude: "",
        // Reward settings
        rewardType: "FIXED", // 'FIXED' | 'UNIT'
        rewardUnitPrice: "",
        billingUnitPrice: "", // New field
        rewardQuantity: "",
        reward: "", // Calculated or input total
        billingAmount: "",
        maxWorkers: "1", // Number of workers needed
        // Date settings
        isFlexible: false,
        date: "", // For fixed date
        startTime: "",
        endTime: "",
        // Flexible settings
        periodStartDate: "",
        periodEndDate: "",
        scheduleNotes: "",
        reportTemplateId: "",
        publish: false,
    });

    useEffect(() => {
        // Fetch clients and templates for dropdown
        const fetchData = async () => {
            const { data: clientsData } = await supabase.from("clients").select("id, name");
            if (clientsData) setClients(clientsData);

            const { data: templatesData } = await supabase
                .from("report_templates")
                .select("id, name")
                .eq("is_active", true)
                .order("name");
            if (templatesData) setTemplates(templatesData);
        };
        fetchData();
    }, []);

    // Helper to calculate total reward and billing
    useEffect(() => {
        if (formData.rewardType === 'UNIT') {
            const unitPrice = parseFloat(formData.rewardUnitPrice) || 0;
            const quantity = parseFloat(formData.rewardQuantity) || 0;
            const rewardTotal = Math.round(unitPrice * quantity);

            const billingUnitPrice = parseFloat(formData.billingUnitPrice) || 0;
            const billingTotal = Math.round(billingUnitPrice * quantity);

            setFormData(prev => ({
                ...prev,
                reward: rewardTotal.toString(),
                billingAmount: billingTotal > 0 ? billingTotal.toString() : prev.billingAmount
            }));
        }
    }, [formData.rewardType, formData.rewardUnitPrice, formData.rewardQuantity, formData.billingUnitPrice]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Validation
            if (!formData.clientId || formData.clientId === "demo-client-id") {
                throw new Error("クライアントを選択してください（デモ用IDは使用できません）");
            }

            const rewardAmount = parseInt(formData.reward); // Total must be integer for now, or just use number
            if (isNaN(rewardAmount)) {
                throw new Error("報酬金額には数値を入力してください");
            }
            if (formData.rewardType === 'UNIT') {
                if (!formData.rewardUnitPrice || !formData.rewardQuantity) {
                    throw new Error("報酬単価と数量を入力してください");
                }
            }

            let startDateTime: Date;
            let endDateTime: Date;
            let workPeriodStart: string | null = null;
            let workPeriodEnd: string | null = null;

            if (formData.isFlexible) {
                // Flexible period logic
                if (!formData.periodStartDate || !formData.periodEndDate) {
                    throw new Error("作業期間を入力してください");
                }
                // For flexible jobs, we still need start_time/end_time for DB constraints (not null)
                // We'll use the period start/end as the "valid" range
                startDateTime = new Date(`${formData.periodStartDate}T00:00`);
                endDateTime = new Date(`${formData.periodEndDate}T23:59`);

                workPeriodStart = startDateTime.toISOString();
                workPeriodEnd = endDateTime.toISOString();
            } else {
                // Fixed date logic
                if (!formData.date) throw new Error("作業日を入力してください");
                startDateTime = new Date(`${formData.date}T${formData.startTime || "00:00"}`);
                endDateTime = new Date(`${formData.date}T${formData.endTime || "23:59"}`);
            }

            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                throw new Error("日時が正しくありません");
            }

            const payload = {
                title: formData.title,
                client_id: formData.clientId,
                description: formData.description,
                address_text: formData.address,
                location: formData.latitude && formData.longitude
                    ? `POINT(${formData.longitude} ${formData.latitude})`
                    : null,
                // Reward fields - use parsed values
                reward_amount: rewardAmount,
                reward_type: formData.rewardType,
                reward_unit_price: formData.rewardType === 'UNIT' ? parseFloat(formData.rewardUnitPrice) : null,
                billing_unit_price: formData.rewardType === 'UNIT' && formData.billingUnitPrice ? parseFloat(formData.billingUnitPrice) : null,
                reward_quantity: formData.rewardType === 'UNIT' ? parseInt(formData.rewardQuantity) : null,

                billing_amount: formData.billingAmount ? parseInt(formData.billingAmount) : null,
                max_workers: parseInt(formData.maxWorkers),
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                is_flexible: formData.isFlexible,
                work_period_start: workPeriodStart,
                work_period_end: workPeriodEnd,
                schedule_notes: formData.scheduleNotes || null,
                report_template_id: formData.reportTemplateId || null,
                status: formData.publish ? "OPEN" : "DRAFT",
            };

            console.log("Sending payload:", payload);

            const { data, error } = await supabase.from("jobs").insert(payload).select();

            if (error) {
                console.error("Supabase Error:", error);
                throw error;
            }

            toast.success("案件を作成しました！");
            router.push("/jobs");
            router.refresh();
        } catch (error: any) {
            console.error("Error creating job:", error);
            // Show detailed error in alert
            const errorMessage = error.message || JSON.stringify(error, null, 2) || "不明なエラーが発生しました";
            toast.error(`エラーが発生しました:\n${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/jobs"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">新規案件作成</h2>
                        <p className="text-muted-foreground">
                            新しい案件情報を入力して公開します。
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-500" />
                                基本情報
                            </h3>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">案件タイトル <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    type="text"
                                    placeholder="例: 渋谷区マンション定期清掃"
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">クライアント <span className="text-red-500">*</span></label>
                                    <Link href="/clients/create" target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                        <Plus className="w-3 h-3" />
                                        新規登録
                                    </Link>
                                </div>
                                <SearchableSelect
                                    required
                                    value={formData.clientId}
                                    onChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                                    options={[
                                        ...clients.map(c => ({ value: c.id, label: c.name })),
                                        ...(clients.length === 0 ? [{ value: "demo-client-id", label: "デモクライアント (DB未接続時はエラーになります)" }] : [])
                                    ]}
                                    placeholder="クライアントを選択してください"
                                    searchPlaceholder="クライアント名で検索"
                                />
                                {clients.length === 0 && (
                                    <p className="text-xs text-orange-500">
                                        ※ クライアントが見つかりません。先にDBにクライアントデータを登録してください。
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">業務詳細</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={5}
                                    placeholder="業務内容の詳細を入力してください..."
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                場所・エリア
                            </h3>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">住所 <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        type="text"
                                        placeholder="東京都渋谷区..."
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">建物名など</label>
                                    <input
                                        type="text"
                                        placeholder="〇〇ビル 1F"
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">緯度 (Latitude)</label>
                                    <input
                                        name="latitude"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        type="number"
                                        step="any"
                                        placeholder="35.xxxxxx"
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">経度 (Longitude)</label>
                                    <input
                                        name="longitude"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        type="number"
                                        step="any"
                                        placeholder="139.xxxxxx"
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">作業報告テンプレート</label>
                                <select
                                    name="reportTemplateId"
                                    value={formData.reportTemplateId}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                >
                                    <option value="">テンプレートなし（デフォルト）</option>
                                    {templates.map(template => (
                                        <option key={template.id} value={template.id}>{template.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    作業報告で使用するテンプレートを選択できます。
                                </p>
                            </div>


                            <p className="text-xs text-muted-foreground">
                                ※ 緯度経度はGoogle Maps等から取得してください。GPSチェックインに使用されます。
                            </p>
                        </div>
                    </div>

                    {/* Sidebar Settings */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-slate-500" />
                                報酬設定
                            </h3>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">募集人数 <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    name="maxWorkers"
                                    value={formData.maxWorkers}
                                    onChange={handleChange}
                                    type="number"
                                    min="1"
                                    placeholder="1"
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none font-medium"
                                />
                                <p className="text-xs text-muted-foreground">
                                    ※ この案件に必要なワーカーの人数
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">報酬設定タイプ</label>
                                    <div className="flex items-center gap-4 mt-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="rewardType"
                                                value="FIXED"
                                                checked={formData.rewardType === "FIXED"}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-slate-900 focus:ring-slate-500"
                                            />
                                            <span className="text-sm">固定金額（総額）</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="rewardType"
                                                value="UNIT"
                                                checked={formData.rewardType === "UNIT"}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-slate-900 focus:ring-slate-500"
                                            />
                                            <span className="text-sm">単価 × 数量</span>
                                        </label>
                                    </div>
                                </div>

                                {formData.rewardType === "UNIT" ? (
                                    <div className="grid gap-4 animate-in fade-in slide-in-from-top-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">数量 <span className="text-red-500">*</span></label>
                                                <input
                                                    required
                                                    name="rewardQuantity"
                                                    value={formData.rewardQuantity}
                                                    onChange={handleChange}
                                                    type="number"
                                                    placeholder="50"
                                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none font-medium"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                {/* Filler */}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">報酬単価（支払） <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
                                                <input
                                                    required
                                                    name="rewardUnitPrice"
                                                    value={formData.rewardUnitPrice}
                                                    onChange={handleChange}
                                                    type="number"
                                                    step="any"
                                                    placeholder="100.5"
                                                    className="w-full pl-7 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none font-medium"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">請求単価（クライアントへ）</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
                                                <input
                                                    name="billingUnitPrice"
                                                    value={formData.billingUnitPrice}
                                                    onChange={handleChange}
                                                    type="number"
                                                    step="any"
                                                    placeholder="150.8"
                                                    className="w-full pl-7 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <label className="text-sm font-medium">報酬金額（1人あたり・円）<span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
                                            <input
                                                required
                                                name="reward"
                                                value={formData.reward}
                                                onChange={handleChange}
                                                type="number"
                                                placeholder="5000"
                                                className="w-full pl-7 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none font-medium"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Total Reward Display for Unit Type */}
                                {formData.rewardType === "UNIT" && (
                                    <div className="p-3 bg-blue-50 rounded-md border border-blue-100 space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-blue-700 font-medium">報酬総額 (支払・四捨五入):</span>
                                            <span className="text-blue-900 font-bold text-lg">
                                                ¥{(parseInt(formData.reward) || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        {formData.billingAmount && parseInt(formData.billingAmount) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-blue-700 font-medium">請求総額 (売上):</span>
                                                <span className="text-blue-900 font-bold">
                                                    ¥{(parseInt(formData.billingAmount) || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {formData.rewardType === "FIXED" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">請求金額（1人あたり・円）</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
                                        <input
                                            name="billingAmount"
                                            value={formData.billingAmount}
                                            onChange={handleChange}
                                            type="number"
                                            placeholder="8000"
                                            className="w-full pl-7 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none font-medium"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        ※ クライアントへの請求額を入力します（任意）
                                    </p>
                                </div>
                            )}

                            {/* Calculations */}
                            {formData.reward && formData.maxWorkers && parseInt(formData.maxWorkers) > 0 && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <h4 className="text-sm font-semibold mb-3 text-slate-700">見積</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">総報酬額:</span>
                                            <span className="font-semibold">
                                                ¥{(parseInt(formData.reward) * parseInt(formData.maxWorkers)).toLocaleString()}
                                            </span>
                                        </div>
                                        {formData.billingAmount && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">総請求額:</span>
                                                    <span className="font-semibold">
                                                        ¥{(parseInt(formData.billingAmount) * parseInt(formData.maxWorkers)).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between pt-2 border-t border-slate-300">
                                                    <span className="text-slate-600">粗利:</span>
                                                    <span className="font-semibold text-green-600">
                                                        ¥{((parseInt(formData.billingAmount) - parseInt(formData.reward)) * parseInt(formData.maxWorkers)).toLocaleString()}
                                                        {' '}
                                                        ({Math.round(((parseInt(formData.billingAmount) - parseInt(formData.reward)) / parseInt(formData.billingAmount)) * 100)}%)
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                日時設定
                            </h3>

                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <input
                                    type="checkbox"
                                    id="isFlexible"
                                    name="isFlexible"
                                    checked={formData.isFlexible}
                                    onChange={handleCheckboxChange}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="isFlexible" className="text-sm font-medium cursor-pointer">
                                    期間指定（好きな日時で実施）
                                </label>
                            </div>

                            {formData.isFlexible ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">開始日 <span className="text-red-500">*</span></label>
                                        <input
                                            required
                                            name="periodStartDate"
                                            value={formData.periodStartDate}
                                            onChange={handleChange}
                                            type="date"
                                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-center text-slate-400">
                                        <ArrowRight className="w-4 h-4 rotate-90" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">終了日 <span className="text-red-500">*</span></label>
                                        <input
                                            required
                                            name="periodEndDate"
                                            value={formData.periodEndDate}
                                            onChange={handleChange}
                                            type="date"
                                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        ※ ワーカーはこの期間内の任意の日時に作業を行います。
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">作業日 <span className="text-red-500">*</span></label>
                                        <input
                                            required
                                            name="date"
                                            value={formData.date}
                                            onChange={handleChange}
                                            type="date"
                                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                        />
                                    </div>

                                    <div className="grid gap-4 grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">開始時間</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    name="startTime"
                                                    value={formData.startTime}
                                                    onChange={handleChange}
                                                    type="time"
                                                    className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">終了時間</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    name="endTime"
                                                    value={formData.endTime}
                                                    onChange={handleChange}
                                                    type="time"
                                                    className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 mt-4">
                                <label className="text-sm font-medium">日時に関する備考</label>
                                <textarea
                                    name="scheduleNotes"
                                    value={formData.scheduleNotes}
                                    onChange={handleChange}
                                    placeholder="例：当日の天候により開始時刻が変更になる可能性があります"
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-slate-400 focus:outline-none min-h-[80px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    ワーカーに表示される日時に関する注意事項や備考を入力できます。
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h3 className="font-semibold">公開設定</h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="publish"
                                    name="publish"
                                    checked={formData.publish}
                                    onChange={handleCheckboxChange}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="publish" className="text-sm">すぐに募集中にする</label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {isLoading ? "保存中..." : "案件を作成"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
