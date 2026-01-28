"use client";

import { useState, useEffect } from "react";
import { Link2, Loader2, Check, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { linkExistingContractToApplication } from "@/app/actions/application";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

type Contract = {
    id: string;
    status: string;
    signed_at: string | null;
    contract_templates: {
        title: string;
    };
};

export function LinkIndividualContractButton({
    applicationId,
    workerId,
    currentContractId,
    currentContractTitle
}: {
    applicationId: string;
    workerId: string;
    currentContractId?: string | null;
    currentContractTitle?: string | null;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const router = useRouter();
    const supabase = createClient();

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("job_individual_contracts")
                .select(`
                    id,
                    status,
                    signed_at,
                    contract_templates (title)
                `)
                .eq("worker_id", workerId)
                .eq("status", "SIGNED")
                .order("signed_at", { ascending: false });

            if (error) throw error;
            setContracts(data as any || []);
        } catch (error) {
            console.error("Error fetching contracts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchContracts();
        }
    }, [isOpen]);

    const handleLink = async (contractId: string | null) => {
        setSubmitting(true);
        try {
            const result = await linkExistingContractToApplication(applicationId, contractId);
            if (result.success) {
                setIsOpen(false);
                router.refresh();
            } else {
                alert("紐付けに失敗しました");
            }
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${currentContractId
                        ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                    }`}
                title={currentContractTitle || "個別契約を紐付ける"}
            >
                <Link2 className="w-3 h-3" />
                {currentContractTitle ? (
                    <span className="max-w-[120px] truncate">{currentContractTitle}</span>
                ) : (
                    "契約を紐付け"
                )}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-600" />
                                個別契約の紐付け
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-4">
                                このワーカーが過去に締結した個別契約から、本案件に適用するものを選択してください。
                            </p>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                    </div>
                                ) : contracts.length > 0 ? (
                                    <>
                                        {contracts.map((contract) => (
                                            <button
                                                key={contract.id}
                                                onClick={() => handleLink(contract.id)}
                                                disabled={submitting}
                                                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${currentContractId === contract.id
                                                        ? "border-purple-600 bg-purple-50 ring-1 ring-purple-600"
                                                        : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                                                        {contract.contract_templates?.title}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        締結日: {formatDate(contract.signed_at)}
                                                    </div>
                                                </div>
                                                {currentContractId === contract.id && (
                                                    <Check className="w-4 h-4 text-purple-600 shrink-0 ml-2" />
                                                )}
                                            </button>
                                        ))}

                                        {currentContractId && (
                                            <button
                                                onClick={() => handleLink(null)}
                                                disabled={submitting}
                                                className="w-full text-center p-2 text-xs text-red-600 hover:text-red-700 transition-colors mt-4"
                                            >
                                                紐付けを解除する
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        <p className="text-sm text-slate-500">締結済みの契約が見つかりません</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
