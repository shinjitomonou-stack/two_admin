"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2, Upload, X, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

function CreateClientContractForm() {
    const cleanNumericInput = (value: string) => {
        if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
            const cleaned = value.replace(/^0+/, '');
            return cleaned === '' ? '0' : cleaned;
        }
        return value;
    };
    const router = useRouter();
    const searchParams = useSearchParams();
    const jobIdFromUrl = searchParams.get('job_id');
    const returnTo = searchParams.get('returnTo');
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    const [formData, setFormData] = useState({
        contract_type: "BASIC" as "BASIC" | "NDA" | "INDIVIDUAL",
        trading_type: "RECEIVING" as "RECEIVING" | "PLACING",
        client_id: "",
        job_id: "",
        template_id: "",
        title: "",
        content_snapshot: "",
        start_date: new Date().toISOString().split('T')[0],
        end_date: "",
        auto_renew: false,
        monthly_amount: "",
        billing_cycle: "ONCE" as "ONCE" | "MONTHLY" | "QUARTERLY" | "YEARLY",
        contract_amount: "",
        payment_terms: "",
        delivery_deadline: "",
        amountTaxMode: "EXCL" as "EXCL" | "INCL",
    });

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            // Fetch clients
            const { data: clientsData } = await supabase
                .from("clients")
                .select("*")
                .order("name");
            setClients(clientsData || []);

            // Fetch templates
            const { data: templatesData } = await supabase
                .from("contract_templates")
                .select("*")
                .eq("is_active", true)
                .order("title");
            setTemplates(templatesData || []);
        };

        fetchData();
    }, []);

    // Handle job_id from URL parameter
    useEffect(() => {
        if (jobIdFromUrl) {
            const fetchJobAndSetup = async () => {
                const supabase = createClient();
                const { data: job } = await supabase
                    .from("jobs")
                    .select("*, clients(id, name)")
                    .eq("id", jobIdFromUrl)
                    .single();

                if (job) {
                    setFormData(prev => ({
                        ...prev,
                        contract_type: "INDIVIDUAL",
                        trading_type: "PLACING",
                        job_id: jobIdFromUrl,
                    }));
                }
            };
            fetchJobAndSetup();
        }
    }, [jobIdFromUrl]);

    useEffect(() => {
        // Fetch jobs when client is selected, or fetch all jobs if it's a PLACING contract
        const shouldFetch = (formData.client_id && formData.contract_type === "INDIVIDUAL") ||
            (formData.trading_type === "PLACING" && formData.contract_type === "INDIVIDUAL");

        if (shouldFetch) {
            const fetchJobs = async () => {
                const supabase = createClient();
                let query = supabase
                    .from("jobs")
                    .select("*");

                // Only filter by client if it's a RECEIVING contract
                if (formData.trading_type === "RECEIVING" && formData.client_id) {
                    query = query.eq("client_id", formData.client_id);
                }

                const { data } = await query.order("created_at", { ascending: false });
                setJobs(data || []);
            };
            fetchJobs();
        }
    }, [formData.client_id, formData.contract_type, formData.trading_type]);

    // Fetch job details when job_id is set (for pre-population)
    useEffect(() => {
        if (formData.job_id && formData.contract_type === "INDIVIDUAL" && !formData.client_id) {
            // When job_id is set from URL, fetch that specific job for the dropdown
            const fetchSpecificJob = async () => {
                const supabase = createClient();
                const { data: job } = await supabase
                    .from("jobs")
                    .select("*")
                    .eq("id", formData.job_id)
                    .single();

                if (job) {
                    setJobs([job]);
                }
            };
            fetchSpecificJob();
        }
    }, [formData.job_id, formData.contract_type, formData.client_id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        try {
            // Upload files to Supabase Storage
            const fileUrls: any[] = [];

            for (const file of uploadedFiles) {
                const fileName = `${Date.now()}_${file.name}`;
                const filePath = `${formData.contract_type.toLowerCase()}/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("contract-documents")
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("File upload error:", uploadError);
                    continue;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from("contract-documents")
                    .getPublicUrl(filePath);

                fileUrls.push({
                    name: file.name,
                    url: publicUrl,
                    uploaded_at: new Date().toISOString(),
                });
            }

            // Insert contract
            if (formData.contract_type === "INDIVIDUAL") {
                const { error } = await supabase
                    .from("client_job_contracts")
                    .insert([{
                        client_id: formData.client_id,
                        job_id: formData.job_id || null,
                        trading_type: formData.trading_type,
                        template_id: formData.template_id || null,
                        title: formData.title,
                        content_snapshot: formData.content_snapshot,
                        contract_amount: formData.amountTaxMode === 'INCL' ? parseFloat(formData.contract_amount) / 1.1 : parseFloat(formData.contract_amount),
                        payment_terms: formData.payment_terms,
                        delivery_deadline: formData.delivery_deadline || null,
                        billing_cycle: formData.billing_cycle,
                        start_date: formData.start_date,
                        end_date: formData.end_date || null,
                        is_auto_renew: formData.auto_renew,
                        uploaded_files: fileUrls,
                    }]);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("client_contracts")
                    .insert([{
                        client_id: formData.client_id,
                        contract_type: formData.contract_type,
                        trading_type: formData.trading_type,
                        template_id: formData.template_id || null,
                        title: formData.title,
                        content_snapshot: formData.content_snapshot,
                        start_date: formData.start_date,
                        end_date: formData.end_date || null,
                        auto_renew: formData.auto_renew,
                        monthly_amount: formData.monthly_amount ? (formData.amountTaxMode === 'INCL' ? parseFloat(formData.monthly_amount) / 1.1 : parseFloat(formData.monthly_amount)) : null,
                        uploaded_files: fileUrls,
                    }]);

                if (error) throw error;
            }

            toast.success("契約を作成しました");
            router.push(returnTo || `/clients/contracts?tab=${formData.contract_type.toLowerCase()}`);
        } catch (error: any) {
            console.error(error);
            toast.error(`エラーが発生しました: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={returnTo || "/clients/contracts"}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">新規契約作成</h2>
                            <p className="text-muted-foreground text-sm">
                                クライアントとの契約を作成します。
                            </p>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        作成する
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="font-bold text-lg border-b border-border pb-3">基本情報</h3>

                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                契約種別 <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.contract_type || "BASIC"}
                                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as any })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="BASIC">基本契約</option>
                                <option value="NDA">NDA（秘密保持契約）</option>
                                <option value="INDIVIDUAL">個別契約</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                取引形態 <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.trading_type || "RECEIVING"}
                                onChange={(e) => setFormData({ ...formData, trading_type: e.target.value as any })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="RECEIVING">受注 (請求する)</option>
                                <option value="PLACING">発注 (支払う)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                クライアント <span className="text-red-500">*</span>
                            </label>
                            <SearchableSelect
                                required
                                value={formData.client_id}
                                onChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                                options={clients.map(c => ({ value: c.id, label: c.name }))}
                                placeholder="クライアントを選択してください"
                                searchPlaceholder="クライアント名で検索"
                            />
                        </div>
                    </div>

                    {formData.contract_type === "INDIVIDUAL" && (
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    関連案件
                                </label>
                                <SearchableSelect
                                    value={formData.job_id}
                                    onChange={(value) => setFormData(prev => ({ ...prev, job_id: value }))}
                                    options={jobs.map(j => ({ value: j.id, label: j.title }))}
                                    placeholder="案件を選択（任意）"
                                    searchPlaceholder="案件名で検索"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    請求サイクル <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.billing_cycle || "ONCE"}
                                    onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as any })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                >
                                    <option value="ONCE">都度 (単発)</option>
                                    <option value="MONTHLY">月次</option>
                                    <option value="QUARTERLY">四半期</option>
                                    <option value="YEARLY">年次</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            契約タイトル <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="例: 業務委託基本契約"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">テンプレート</label>
                        <select
                            value={formData.template_id || ""}
                            onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            <option value="">テンプレートなし</option>
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.title} (v{template.version})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Contract Type Specific Fields */}
                {formData.contract_type !== "INDIVIDUAL" && (
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                        <h3 className="font-bold text-lg border-b border-border pb-3">契約条件</h3>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    開始日 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">終了日</label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                                <p className="text-xs text-muted-foreground">空欄の場合は無期限</p>
                            </div>
                        </div>

                        {formData.contract_type === "BASIC" && (
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">月額金額</label>
                                        <div className="flex bg-slate-100 rounded-md p-0.5 text-[10px] font-bold">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, amountTaxMode: 'EXCL' }))}
                                                className={`px-2 py-0.5 rounded ${formData.amountTaxMode === 'EXCL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                                            >
                                                税抜
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, amountTaxMode: 'INCL' }))}
                                                className={`px-2 py-0.5 rounded ${formData.amountTaxMode === 'INCL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                                            >
                                                税込
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.monthly_amount}
                                        onChange={(e) => setFormData({ ...formData, monthly_amount: cleanNumericInput(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                        placeholder="0"
                                    />
                                    {formData.monthly_amount && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {formData.amountTaxMode === 'INCL'
                                                ? `税抜金額: ¥${Math.round(parseFloat(formData.monthly_amount) / 1.1).toLocaleString()}`
                                                : `税込金額: ¥${Math.round(parseFloat(formData.monthly_amount) * 1.1).toLocaleString()}`
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="auto_renew"
                                checked={formData.auto_renew}
                                onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                                className="w-4 h-4 rounded border-input"
                            />
                            <label htmlFor="auto_renew" className="text-sm font-medium">
                                自動更新
                            </label>
                        </div>

                    </div>
                )}

                {formData.contract_type === "INDIVIDUAL" && (
                    <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                        <h3 className="font-bold text-lg border-b border-border pb-3">契約条件</h3>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">
                                    契約金額 <span className="text-red-500">*</span>
                                </label>
                                <div className="flex bg-slate-100 rounded-md p-0.5 text-[10px] font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, amountTaxMode: 'EXCL' }))}
                                        className={`px-2 py-0.5 rounded ${formData.amountTaxMode === 'EXCL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                                    >
                                        税抜
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, amountTaxMode: 'INCL' }))}
                                        className={`px-2 py-0.5 rounded ${formData.amountTaxMode === 'INCL' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                                    >
                                        税込
                                    </button>
                                </div>
                            </div>
                            <input
                                type="number"
                                step="any"
                                required
                                value={formData.contract_amount}
                                onChange={(e) => setFormData({ ...formData, contract_amount: cleanNumericInput(e.target.value) })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                placeholder="0"
                            />
                            {formData.contract_amount && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {formData.amountTaxMode === 'INCL'
                                        ? `税抜金額: ¥${Math.round(parseFloat(formData.contract_amount) / 1.1).toLocaleString()}`
                                        : `税込金額: ¥${Math.round(parseFloat(formData.contract_amount) * 1.1).toLocaleString()}`
                                    }
                                </p>
                            )}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    開始日 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">終了日</label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                                <p className="text-xs text-muted-foreground">空欄の場合は無期限</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="auto_renew_individual"
                                checked={formData.auto_renew}
                                onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                                className="w-4 h-4 rounded border-input"
                            />
                            <label htmlFor="auto_renew_individual" className="text-sm font-medium">
                                自動更新
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">支払条件</label>
                            <textarea
                                value={formData.payment_terms}
                                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                rows={3}
                                placeholder="例: 納品後30日以内に銀行振込"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">納品期限</label>
                            <input
                                type="date"
                                value={formData.delivery_deadline}
                                onChange={(e) => setFormData({ ...formData, delivery_deadline: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            />
                        </div>
                    </div>
                )}

                {/* File Upload */}
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="font-bold text-lg border-b border-border pb-3">契約書ファイル</h3>

                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                            <input
                                type="file"
                                id="file-upload"
                                multiple
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                                <p className="text-sm font-medium text-slate-700">
                                    ファイルをドラッグ&ドロップ、またはクリックして選択
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PDF, PNG, JPG (最大10MB/ファイル)
                                </p>
                            </label>
                        </div>

                        {uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">アップロード予定のファイル:</p>
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm">{file.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                                        >
                                            <X className="w-4 h-4 text-slate-500" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="font-bold text-lg border-b border-border pb-3">契約内容</h3>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">契約書本文</label>
                        <textarea
                            value={formData.content_snapshot}
                            onChange={(e) => setFormData({ ...formData, content_snapshot: e.target.value })}
                            className="w-full h-64 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="契約書の内容を入力してください..."
                        />
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}

export default function CreateClientContractPage() {
    return (
        <Suspense fallback={
            <AdminLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </AdminLayout>
        }>
            <CreateClientContractForm />
        </Suspense>
    );
}
