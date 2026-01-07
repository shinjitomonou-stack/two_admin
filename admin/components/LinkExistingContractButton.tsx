"use client";

import { useState } from "react";
import { Link2, X, Check, Loader2 } from "lucide-react";

interface Contract {
    id: string;
    title: string;
    contract_amount: number;
    clients: { name: string };
}

export function LinkExistingContractButton({
    jobId,
    currentContractId
}: {
    jobId: string;
    currentContractId?: string | null;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [selectedContractId, setSelectedContractId] = useState(currentContractId || "");
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    const openModal = async () => {
        setIsOpen(true);
        setIsFetching(true);
        try {
            const res = await fetch(`/api/contracts/available?jobId=${jobId}`);
            const data = await res.json();
            setContracts(data.contracts || []);
        } catch (error) {
            console.error("Failed to fetch contracts:", error);
        } finally {
            setIsFetching(false);
        }
    };

    const filteredContracts = contracts.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.clients?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLink = async () => {
        if (!selectedContractId) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/jobs/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobId,
                    contractId: selectedContractId,
                }),
            });

            if (response.ok) {
                window.location.reload();
            } else {
                alert("紐付けに失敗しました");
            }
        } catch (error) {
            console.error(error);
            alert("エラーが発生しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={openModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
                <Link2 className="w-4 h-4" />
                既存契約を紐付け
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">既存契約を紐付け</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-slate-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            この案件を外部業者の月次個別契約（マスター契約）に紐付けます。
                        </p>

                        <div className="space-y-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="契約名や業者名で検索..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    autoFocus
                                />
                            </div>

                            {isFetching ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                </div>
                            ) : filteredContracts.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <p className="text-sm text-slate-500">
                                        紐付け可能な有効な個別契約が見つかりませんでした。
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {filteredContracts.map((contract) => (
                                        <button
                                            key={contract.id}
                                            onClick={() => setSelectedContractId(contract.id)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${selectedContractId === contract.id
                                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">
                                                    {contract.title}
                                                </div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                    <span>{contract.clients?.name}</span>
                                                    <span>•</span>
                                                    <span>¥{contract.contract_amount?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            {selectedContractId === contract.id && (
                                                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleLink}
                                disabled={!selectedContractId || isLoading || isFetching}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                            >
                                {isLoading ? "処理中..." : "紐付ける"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
