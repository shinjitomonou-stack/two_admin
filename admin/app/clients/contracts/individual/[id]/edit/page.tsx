"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2, Upload, X, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EditIndividualContractPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [clients, setClients] = useState<any[]>([]);
    const [jobs, setJobs] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [existingFiles, setExistingFiles] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        contract_type: "INDIVIDUAL" as "BASIC" | "NDA" | "INDIVIDUAL",
        trading_type: "RECEIVING" as "RECEIVING" | "PLACING",
        client_id: "",
        job_id: "",
        template_id: "",
        title: "",
        content_snapshot: "",
        contract_amount: "",
        payment_terms: "",
        delivery_deadline: "",
        billing_cycle: "ONCE" as "ONCE" | "MONTHLY" | "QUARTERLY" | "YEARLY",
        start_date: "",
        end_date: "",
        is_auto_renew: false,
    });

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            try {
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

                // Fetch contract data
                const { data: contract, error } = await supabase
                    .from("client_job_contracts")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) throw error;

                if (contract) {
                    setFormData({
                        contract_type: "INDIVIDUAL",
                        trading_type: contract.trading_type,
                        client_id: contract.client_id,
                        job_id: contract.job_id || "",
                        template_id: contract.template_id || "",
                        title: contract.title,
                        content_snapshot: contract.content_snapshot || "",
                        contract_amount: contract.contract_amount ? contract.contract_amount.toString() : "",
                        payment_terms: contract.payment_terms || "",
                        delivery_deadline: contract.delivery_deadline || "",
                        billing_cycle: contract.billing_cycle || "ONCE",
                        start_date: contract.start_date || "",
                        end_date: contract.end_date || "",
                        is_auto_renew: contract.is_auto_renew || false,
                    });

                    if (contract.uploaded_files) {
                        setExistingFiles(contract.uploaded_files);
                    }

                    // Fetch jobs for this client
                    if (contract.client_id) {
                        const { data: jobsData } = await supabase
                            .from("jobs")
                            .select("*")
                            .eq("client_id", contract.client_id)
                            .order("created_at", { ascending: false });
                        setJobs(jobsData || []);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                alert("データの取得に失敗しました");
            } finally {
                setIsFetching(false);
            }
        };

        fetchData();
    }, [id]);

    // Handle client change to update jobs list
    const handleClientChange = async (clientId: string) => {
        setFormData({ ...formData, client_id: clientId, job_id: "" });

        if (clientId) {
            const supabase = createClient();
            const { data } = await supabase
                .from("jobs")
                .select("*")
                .eq("client_id", clientId)
                .order("created_at", { ascending: false });
            setJobs(data || []);
        } else {
            setJobs([]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
        }
    };

    const removeUploadedFile = (index: number) => {
        setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
    };

    const removeExistingFile = (index: number) => {
        if (confirm("このファイルを削除してもよろしいですか？保存するまで反映されません。")) {
            setExistingFiles(existingFiles.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        try {
            // Upload new files to Supabase Storage
            const newFileUrls: any[] = [];

            for (const file of uploadedFiles) {
                const fileName = `${Date.now()}_${file.name}`;
                const filePath = `individual/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("contract-documents")
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("File upload error:", uploadError);
                    continue;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from("contract-documents")
                    .getPublicUrl(filePath);

                newFileUrls.push({
                    name: file.name,
                    url: publicUrl,
                    uploaded_at: new Date().toISOString(),
                });
            }

            // Combine existing and new files
            const allFiles = [...existingFiles, ...newFileUrls];

            // Update contract
            const { error } = await supabase
                .from("client_job_contracts")
                .update({
                    client_id: formData.client_id,
                    job_id: formData.job_id || null,
                    trading_type: formData.trading_type,
                    template_id: formData.template_id || null,
                    title: formData.title,
                    content_snapshot: formData.content_snapshot,
                    contract_amount: parseFloat(formData.contract_amount),
                    payment_terms: formData.payment_terms,
                    delivery_deadline: formData.delivery_deadline || null,
                    billing_cycle: formData.billing_cycle,
                    start_date: formData.start_date,
                    end_date: formData.end_date || null,
                    is_auto_renew: formData.is_auto_renew,
                    uploaded_files: allFiles,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id);

            if (error) throw error;

            alert("契約を更新しました");
            router.push(`/clients/contracts?tab=individual`);
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
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/clients/contracts?tab=individual`}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">個別契約編集</h2>
                            <p className="text-muted-foreground text-sm">
                                個別契約の内容を編集します。
                            </p>
                        </div>
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
                    <h3 className="font-bold text-lg border-b border-border pb-3">基本情報</h3>

                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                契約種別 <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.contract_type}
                                disabled
                                className="w-full px-3 py-2 rounded-md border border-input bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-not-allowed"
                            >
                                <option value="INDIVIDUAL">個別契約</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                取引形態 <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.trading_type}
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
                            <select
                                required
                                value={formData.client_id || ""}
                                onChange={(e) => handleClientChange(e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="">選択してください</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                関連案件
                            </label>
                            <select
                                value={formData.job_id || ""}
                                onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="">選択してください（任意）</option>
                                {jobs.map((job) => (
                                    <option key={job.id} value={job.id}>
                                        {job.title}
                                    </option>
                                ))}
                            </select>
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
                            placeholder="例: 個別契約"
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

                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                    <h3 className="font-bold text-lg border-b border-border pb-3">契約条件</h3>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            契約金額 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.contract_amount}
                            onChange={(e) => setFormData({ ...formData, contract_amount: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="0"
                        />
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
                            id="is_auto_renew_edit"
                            checked={formData.is_auto_renew}
                            onChange={(e) => setFormData({ ...formData, is_auto_renew: e.target.checked })}
                            className="w-4 h-4 rounded border-input"
                        />
                        <label htmlFor="is_auto_renew_edit" className="text-sm font-medium">
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

                        {(existingFiles.length > 0 || uploadedFiles.length > 0) && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">添付ファイル:</p>

                                {/* Existing Files */}
                                {existingFiles.map((file, index) => (
                                    <div key={`existing-${index}`} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-500" />
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline text-blue-600">
                                                {file.name}
                                            </a>
                                            <span className="text-xs text-muted-foreground">
                                                (登録済み)
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeExistingFile(index)}
                                            className="p-1 hover:bg-slate-200 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                ))}

                                {/* New Files */}
                                {uploadedFiles.map((file, index) => (
                                    <div key={`new-${index}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm">{file.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                新規
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeUploadedFile(index)}
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
