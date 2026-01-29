"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Save, Loader2, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [id, setId] = useState<string | null>(null);
    const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

    const [formData, setFormData] = useState({
        title: "",
        type: "BASIC",
        version: "1.0",
        content_template: "",
        is_active: true,
        client_id: "" as string | null,
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            const resolvedParams = await params;
            setId(resolvedParams.id);
            const supabase = createClient();

            // Fetch clients
            const { data: clientsData } = await supabase
                .from("clients")
                .select("id, name")
                .order("name");
            if (clientsData) setClients(clientsData);

            if (resolvedParams.id === 'create') {
                setIsFetching(false);
                return;
            }

            const { data, error } = await supabase
                .from("contract_templates")
                .select("*")
                .eq("id", resolvedParams.id)
                .single();

            if (error) {
                console.error(error);
                alert("テンプレートの取得に失敗しました");
                router.push("/contracts/templates");
                return;
            }

            if (data) {
                setFormData({
                    title: data.title,
                    type: data.type,
                    version: data.version,
                    content_template: data.content_template,
                    is_active: data.is_active,
                    client_id: data.client_id || "",
                });
            }
            setIsFetching(false);
        };

        fetchInitialData();
    }, [params, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        // Sanitize formData for database
        const payload = {
            ...formData,
            client_id: formData.client_id === "" ? null : formData.client_id
        };

        try {
            if (id === 'create') {
                const { error } = await supabase
                    .from("contract_templates")
                    .insert([payload]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("contract_templates")
                    .update(payload)
                    .eq("id", id);
                if (error) throw error;
            }

            alert("保存しました");
            router.push("/contracts/templates");
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
            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/contracts/templates"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {id === 'create' ? 'テンプレート新規作成' : 'テンプレート編集'}
                        </h2>
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
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">テンプレート名</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                placeholder="例: 業務委託基本契約書"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">種類</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="BASIC">基本契約 (Basic)</option>
                                <option value="INDIVIDUAL">個別契約 (Individual)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">クライアント (任意)</label>
                            <select
                                value={formData.client_id || ""}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                                <option value="">共通テンプレート</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">バージョン</label>
                            <input
                                type="text"
                                required
                                value={formData.version}
                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                placeholder="1.0"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">ステータス</label>
                            <div className="flex items-center gap-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={formData.is_active}
                                        onChange={() => setFormData({ ...formData, is_active: true })}
                                        className="text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-sm">有効</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={!formData.is_active}
                                        onChange={() => setFormData({ ...formData, is_active: false })}
                                        className="text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-sm text-muted-foreground">無効</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            契約書本文
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                                ※ マークダウン形式で記述可能です。
                            </span>
                        </label>

                        {/* Placeholders List */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                            <p className="text-xs font-bold text-slate-700">利用可能な変数（クリックしてコピー）</p>

                            <div className="space-y-2">
                                <div>
                                    <span className="text-[10px] text-slate-500 font-medium mb-1 block">ワーカー情報</span>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: '{{worker_name}}', label: 'ワーカー氏名' },
                                            { key: '{{worker_address}}', label: 'ワーカー住所' },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(item.key);
                                                    alert(`「${item.key}」をコピーしました`);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs hover:bg-slate-100 hover:border-slate-300 transition-colors group"
                                            >
                                                <code className="font-mono text-blue-600">{item.key}</code>
                                                <span className="text-slate-600 text-[10px]">({item.label})</span>
                                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 ml-1" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] text-slate-500 font-medium mb-1 block">自社情報</span>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: '{{company_name}}', label: '自社名' },
                                            { key: '{{company_address}}', label: '自社住所' },
                                            { key: '{{company_rep}}', label: '代表者名' },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(item.key);
                                                    alert(`「${item.key}」をコピーしました`);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs hover:bg-slate-100 hover:border-slate-300 transition-colors group"
                                            >
                                                <code className="font-mono text-purple-600">{item.key}</code>
                                                <span className="text-slate-600 text-[10px]">({item.label})</span>
                                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 ml-1" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] text-slate-500 font-medium mb-1 block">案件情報 (個別契約のみ)</span>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: '{{job_title}}', label: '案件名' },
                                            { key: '{{reward_amount}}', label: '報酬金額' },
                                            { key: '{{start_date}}', label: '開始日' },
                                            { key: '{{end_date}}', label: '終了日' },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(item.key);
                                                    alert(`「${item.key}」をコピーしました`);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs hover:bg-slate-100 hover:border-slate-300 transition-colors group"
                                            >
                                                <code className="font-mono text-orange-600">{item.key}</code>
                                                <span className="text-slate-600 text-[10px]">({item.label})</span>
                                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 ml-1" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] text-slate-500 font-medium mb-1 block">日付変数 (自動計算)</span>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: '{{TODAY}}', label: '今日' },
                                            { key: '{{TODAY+1}}', label: '明日' },
                                            { key: '{{TODAY+30}}', label: '30日後' },
                                        ].map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(item.key);
                                                    alert(`「${item.key}」をコピーしました`);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs hover:bg-slate-100 hover:border-slate-300 transition-colors group"
                                            >
                                                <code className="font-mono text-green-600">{item.key}</code>
                                                <span className="text-slate-600 text-[10px]">({item.label})</span>
                                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 ml-1" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <textarea
                            required
                            value={formData.content_template}
                            onChange={(e) => setFormData({ ...formData, content_template: e.target.value })}
                            className="w-full h-96 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="# 業務委託基本契約書&#13;&#10;&#13;&#10;甲（発注者）と乙（受注者）は、以下の通り契約を締結する..."
                        />
                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
