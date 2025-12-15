"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Worker = {
    id: string;
    full_name: string;
    email: string;
};

type Template = {
    id: string;
    title: string;
    version: string;
};



export default function CreateContractPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const [contractType, setContractType] = useState<"BASIC" | "INDIVIDUAL">("BASIC");
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);

    const [formData, setFormData] = useState({
        worker_id: "",
        template_id: "",
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsFetching(true);
            const supabase = createClient();

            // Fetch Templates based on type
            const { data: templatesData } = await supabase
                .from("contract_templates")
                .select("id, title, version")
                .eq("type", contractType)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (templatesData) {
                setTemplates(templatesData);
                if (templatesData.length > 0) {
                    setFormData(prev => ({ ...prev, template_id: templatesData[0].id }));
                } else {
                    setFormData(prev => ({ ...prev, template_id: "" }));
                }
            }

            // Fetch Workers for both contract types
            const { data: workersData } = await supabase
                .from("workers")
                .select("id, full_name, email")
                .order("created_at", { ascending: false });
            if (workersData) setWorkers(workersData);

            setIsFetching(false);
        };

        fetchData();
    }, [contractType]);

    // Calculate available workers - No longer needed as we fetch all workers for both types
    // Filter applications - No longer needed


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.worker_id) {
            alert("ワーカーを選択してください");
            return;
        }
        if (!formData.template_id) {
            alert("テンプレートを選択してください");
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

            // 2. Insert contract request (PENDING)
            if (contractType === "BASIC") {
                const { error } = await supabase
                    .from("worker_basic_contracts")
                    .insert([
                        {
                            worker_id: formData.worker_id,
                            template_id: formData.template_id,
                            status: "PENDING",
                        },
                    ]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("job_individual_contracts")
                    .insert([
                        {
                            // application_id is now optional/removed, use worker_id instead
                            worker_id: formData.worker_id,
                            template_id: formData.template_id,
                            status: "PENDING",
                        },
                    ]);
                if (error) throw error;
            }

            alert("契約依頼を作成しました");
            router.push(`/contracts?tab=${contractType.toLowerCase()}`);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(`エラーが発生しました: ${error.message}`);
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
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
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

                    {/* Combined Worker Selection for both types */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ワーカー <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={formData.worker_id}
                            onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            <option value="">選択してください</option>
                            {workers.map((worker) => (
                                <option key={worker.id} value={worker.id}>
                                    {worker.full_name} ({worker.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">契約書テンプレート <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={formData.template_id}
                            onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.title} (Ver. {template.version})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
                        <p>※ ワーカーに対して契約締結の依頼を作成します。</p>
                        <p className="mt-1">※ 作成後、ワーカーのアプリ上に「未締結」として表示され、同意を求めることができます。</p>
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
