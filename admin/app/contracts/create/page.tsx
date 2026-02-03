"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { createWorkerBasicContract, createJobIndividualContract } from "@/app/actions/contract";

type Worker = {
    id: string;
    full_name: string;
    email: string;
};

type Template = {
    id: string;
    title: string;
    version: string;
    content_template: string;
};




import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function CreateContractPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const [contractType, setContractType] = useState<"BASIC" | "INDIVIDUAL">("BASIC");
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);

    const [formData, setFormData] = useState({
        worker_id: "",
        template_id: "",
        client_id: "",
    });

    const [selectedTemplateContent, setSelectedTemplateContent] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setIsFetching(true);
            const supabase = createClient();

            // Fetch Clients
            const { data: clientsData } = await supabase
                .from("clients")
                .select("id, name")
                .order("name");
            if (clientsData) setClients(clientsData);

            // Fetch Templates based on type and client
            let query = supabase
                .from("contract_templates")
                .select("id, title, version, content_template")
                .eq("type", contractType)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (contractType === "INDIVIDUAL") {
                if (formData.client_id) {
                    query = query.eq("client_id", formData.client_id);
                } else {
                    // If no client selected for individual, maybe show none or only global?
                    // Let's show only global templates if no client selected.
                    query = query.is("client_id", null);
                }
            } else {
                // For BASIC, usually global
                query = query.is("client_id", null);
            }

            const { data: templatesData } = await query;

            if (templatesData) {
                setTemplates(templatesData);
                if (templatesData.length > 0) {
                    // Only auto-select if current template_id is not in new list
                    if (!templatesData.find(t => t.id === formData.template_id)) {
                        setFormData(prev => ({ ...prev, template_id: templatesData[0].id }));
                        setSelectedTemplateContent(templatesData[0].content_template || "");
                    } else {
                        // refresh content if needed
                        const current = templatesData.find(t => t.id === formData.template_id);
                        if (current) setSelectedTemplateContent(current.content_template || "");
                    }
                } else {
                    setFormData(prev => ({ ...prev, template_id: "" }));
                    setSelectedTemplateContent("");
                }
            }

            // Fetch Workers
            const { data: workersData } = await supabase
                .from("workers")
                .select("id, full_name, email")
                .order("created_at", { ascending: false });
            if (workersData) setWorkers(workersData);

            setIsFetching(false);
        };

        fetchData();
    }, [contractType, formData.client_id]);

    // Calculate available workers - No longer needed as we fetch all workers for both types
    // Filter applications - No longer needed


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.worker_id) {
            toast.error("ワーカーを選択してください");
            return;
        }
        if (!formData.template_id) {
            toast.error("テンプレートを選択してください");
            return;
        }

        setIsLoading(true);
        const supabase = createClient();

        try {
            // 1. Get template content for snapshot (optional validation)
            const { data: template } = await supabase
                .from("contract_templates")
                .select("id")
                .eq("id", formData.template_id)
                .single();

            if (!template) throw new Error("テンプレートが見つかりません");

            // 2. Insert contract request via Server Actions
            let result;
            if (contractType === "BASIC") {
                result = await createWorkerBasicContract(formData.worker_id, formData.template_id);
            } else {
                result = await createJobIndividualContract(formData.worker_id, formData.template_id);
            }

            if (!result.success) throw result.error;

            toast.success("契約依頼を作成しました");
            router.push(`/contracts?tab=${contractType.toLowerCase()}`);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast.error(`エラーが発生しました: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching && !workers.length && !templates.length) {
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
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/contracts"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">新規契約依頼</h2>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        依頼を作成
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">

                    {/* Contract Type Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">契約種別 <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="contractType"
                                    value="BASIC"
                                    checked={contractType === "BASIC"}
                                    onChange={() => {
                                        setContractType("BASIC");
                                        setFormData(prev => ({ ...prev, worker_id: "" }));
                                    }}
                                    className="w-4 h-4 text-slate-900 focus:ring-slate-500"
                                />
                                <span className="text-sm">基本契約</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="contractType"
                                    value="INDIVIDUAL"
                                    checked={contractType === "INDIVIDUAL"}
                                    onChange={() => {
                                        setContractType("INDIVIDUAL");
                                        setFormData(prev => ({ ...prev, worker_id: "" }));
                                    }}
                                    className="w-4 h-4 text-slate-900 focus:ring-slate-500"
                                />
                                <span className="text-sm">個別契約</span>
                            </label>
                        </div>
                    </div>

                    {/* Client Selection (for Individual Contracts) */}
                    {contractType === "INDIVIDUAL" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">クライアント <span className="text-red-500">*</span></label>
                            <SearchableSelect
                                required
                                value={formData.client_id}
                                onChange={(value) => setFormData(prev => ({ ...prev, client_id: value, template_id: "" }))}
                                options={clients.map(c => ({
                                    value: c.id,
                                    label: c.name
                                }))}
                                placeholder="クライアントを選択してください"
                                searchPlaceholder="クライアント名で検索"
                            />
                        </div>
                    )}

                    {/* Combined Worker Selection for both types */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ワーカー <span className="text-red-500">*</span></label>
                        <SearchableSelect
                            required
                            value={formData.worker_id}
                            onChange={(value) => setFormData(prev => ({ ...prev, worker_id: value }))}
                            options={workers.map(w => ({
                                value: w.id,
                                label: w.full_name,
                                subLabel: w.email
                            }))}
                            placeholder="ワーカーを選択してください"
                            searchPlaceholder="名前やメールアドレスで検索"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">契約書テンプレート <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={formData.template_id}
                            onChange={(e) => {
                                const newId = e.target.value;
                                setFormData({ ...formData, template_id: newId });
                                const t = templates.find(temp => temp.id === newId);
                                setSelectedTemplateContent(t?.content_template || "");
                            }}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.title} (Ver. {template.version})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedTemplateContent && (
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                                プレビュー: {templates.find(t => t.id === formData.template_id)?.title}
                            </h3>
                            <div className="prose prose-sm max-w-none bg-white p-6 rounded-lg border border-slate-200 shadow-sm max-h-[500px] overflow-y-auto">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {selectedTemplateContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
                        <p>※ ワーカーに対して契約締結の依頼を作成します。</p>
                        <p className="mt-1">※ 作成後、ワーカーのアプリ上に「未締結」として表示され、同意を求めることができます。</p>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
