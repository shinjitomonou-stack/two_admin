"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle, Loader2, Download } from "lucide-react";
// import { bulkUpdateWorkerBankAccounts } from "@/app/actions/worker";
import { toast } from "sonner";

interface BulkBankAccountRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BulkBankAccountRegisterModal({ isOpen, onClose }: BulkBankAccountRegisterModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ row: number; id: string; message: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const parseCSV = (text: string) => {
        if (!text.trim()) return [];

        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentCell = "";
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentCell.trim());
                currentCell = "";
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (currentCell || currentRow.length > 0) {
                    currentRow.push(currentCell.trim());
                    rows.push(currentRow);
                    currentCell = "";
                    currentRow = [];
                }
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                currentCell += char;
            }
        }

        if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
        }

        if (rows.length < 2) return [];

        const headers = rows[0];
        // Expected headers: ID, ワーカーID, 銀行名, 支店名, 種別, 口座番号, 口座名義, 口座名義(カナ)
        // Map to internal keys
        const headerMap: Record<string, string> = {
            "ID": "id",
            "ワーカーID": "worker_number",
            "銀行名": "bank_name",
            "支店名": "branch_name",
            "種別": "account_type",
            "口座番号": "account_number",
            "口座名義": "account_holder_name",
            "口座名義(カナ)": "account_holder_name_kana"
        };

        return rows.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
                const key = headerMap[header.trim()] || header.trim();
                obj[key] = row[index] || "";
            });
            return obj;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setIsParsing(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const data = parseCSV(text);
                setPreviewData(data);
                setIsParsing(false);
            };
            reader.readAsText(selectedFile);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveFile = () => {
        setFile(null);
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async () => {
        if (previewData.length === 0) return;
        setIsSubmitting(true);
        setErrors([]); // Clear previous errors

        try {
            // MOCK SUBMIT - Server action is commented out
            // const result = await bulkUpdateWorkerBankAccounts(previewData);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = { success: true, count: previewData.length, errors: [] };

            if (result.success) {
                toast.success(`${result.count}件の口座情報を更新しました。(TEST)`);
                onClose();
            } else {
                if (result.errors) {
                    setErrors(result.errors);
                    toast.error(`${result.count}件更新完了、${result.errors.length}件エラーが発生しました。`);
                } else {
                    toast.error("更新に失敗しました。");
                }
            }
        } catch (error) {
            toast.error("更新中にエラーが発生しました。");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadSampleCSV = () => {
        // ID, ワーカーID, 銀行名, 支店名, 種別, 口座番号, 口座名義, 口座名義(カナ)
        const headers = "ID,ワーカーID,銀行名,支店名,種別,口座番号,口座名義,口座名義(カナ)";
        const sample1 = ",W10001,三菱UFJ銀行,渋谷支店,普通,1234567,ヤマダ タロウ,ヤマダ タロウ";
        const sample2 = "uuid-goes-here,,三井住友銀行,新宿支店,当座,7654321,株式会社テスト,カbs";
        const csvContent = `${headers}\n${sample1}\n${sample2}`;
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "bank_accounts_template.csv");
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            口座情報一括登録 (UI Test)
                        </h2>
                        <p className="text-sm text-slate-500">CSVファイルをアップロードして既存ワーカーの銀行口座情報を更新します。</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!file ? (
                        <div className="space-y-6">
                            <div
                                onClick={handleUploadClick}
                                className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer group"
                            >
                                <div className="p-4 bg-slate-50 rounded-full group-hover:bg-white transition-colors">
                                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-slate-900">CSVファイルをドロップ、または選択</p>
                                    <p className="text-sm text-slate-500">
                                        IDまたはワーカーID(W番号)の一致するワーカーの口座情報を更新します
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                <Download className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-blue-900">サンプルファイルをダウンロード</p>
                                    <p className="text-xs text-blue-700 mt-1 mb-3">正しい形式で入力するために、テンプレートをご利用ください。</p>
                                    <button
                                        onClick={downloadSampleCSV}
                                        className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                                    >
                                        テンプレートをダウンロード
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                        <FileText className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • {previewData.length}件のデータ</p>
                                    </div>
                                </div>
                                <button onClick={handleRemoveFile} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3 border-b border-slate-200 w-32">ワーカーID</th>
                                                <th className="px-4 py-3 border-b border-slate-200">銀行名</th>
                                                <th className="px-4 py-3 border-b border-slate-200">支店名</th>
                                                <th className="px-4 py-3 border-b border-slate-200">種別</th>
                                                <th className="px-4 py-3 border-b border-slate-200">口座番号</th>
                                                <th className="px-4 py-3 border-b border-slate-200">口座名義(カナ)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {previewData.slice(0, 50).map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-xs">{row.worker_number || row.id || <span className="text-red-500">IDなし</span>}</td>
                                                    <td className="px-4 py-3">{row.bank_name}</td>
                                                    <td className="px-4 py-3">{row.branch_name}</td>
                                                    <td className="px-4 py-3">{row.account_type}</td>
                                                    <td className="px-4 py-3 font-mono">{row.account_number}</td>
                                                    <td className="px-4 py-3">{row.account_holder_name_kana}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {previewData.length > 50 && (
                                    <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 italic border-t border-slate-200">
                                        ほか {previewData.length - 50} 件を表示...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex flex-col gap-4 bg-slate-50/50">
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!file || isParsing || isSubmitting || previewData.length === 0}
                            className="px-8 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    更新中...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    {previewData.length}件を更新
                                </>
                            )}
                        </button>
                    </div>

                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                            <h4 className="text-red-800 font-semibold text-sm mb-2 flex items-center gap-2">
                                <X className="w-4 h-4" />
                                {errors.length}件のエラーが発生しました
                            </h4>
                            <ul className="text-xs text-red-700 space-y-1">
                                {errors.map((error, idx) => (
                                    <li key={idx} className="flex gap-2">
                                        <span className="font-mono bg-red-100 px-1 rounded shrink-0 w-8 text-center">{error.row}行</span>
                                        <span className="font-mono bg-red-100 px-1 rounded shrink-0">{error.id}</span>
                                        <span>{error.message}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
