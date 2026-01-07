"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Download, User } from "lucide-react";
import { bulkCreateWorkersAction } from "@/app/actions/worker";
import { toast } from "sonner";

interface BulkWorkerRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BulkWorkerRegisterModal({ isOpen, onClose }: BulkWorkerRegisterModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
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
        return rows.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || "";
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
        try {
            const result = await bulkCreateWorkersAction(previewData);
            if (result.success) {
                toast.success(`${result.count}件のワーカーを一括登録しました。`);
                onClose();
            } else {
                if (result.errors) {
                    toast.error(`${result.count}件登録、${result.errors.length}件エラーが発生しました。詳細はログを確認してください。`);
                    console.error("Bulk import errors:", result.errors);
                } else {
                    toast.error("一括登録に失敗しました。");
                }
            }
        } catch (error) {
            toast.error("一括登録中にエラーが発生しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    const downloadSampleCSV = () => {
        const headers = "full_name,name_kana,email,phone,postal_code,address,gender,birth_date,rank,tags,worker_number";
        const sample1 = "田中 太郎,タナカ タロウ,tanaka@example.com,090-1111-2222,150-0001,東京都渋谷区...,男性,1990-01-01,Bronze,\"経験者, 運転免許\",W10001";
        const sample2 = "佐藤 花子,サトウ ハナコ,sato@example.com,080-3333-4444,160-0002,東京都新宿区...,女性,1992-05-15,Silver,早朝対応可,";
        const csvContent = `${headers}\n${sample1}\n${sample2}`;
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "workers_bulk_template.csv");
        link.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            ワーカー一括登録
                        </h2>
                        <p className="text-sm text-slate-500">CSVファイルをアップロードして複数のワーカーを一括でアカウント作成・登録します。</p>
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
                                    <p className="text-sm text-slate-500">既存システムのワーカー情報を一括でインポートできます</p>
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
                                                <th className="px-4 py-3 border-b border-slate-200">氏名</th>
                                                <th className="px-4 py-3 border-b border-slate-200">メール</th>
                                                <th className="px-4 py-3 border-b border-slate-200">性別</th>
                                                <th className="px-4 py-3 border-b border-slate-200">生年月日</th>
                                                <th className="px-4 py-3 border-b border-slate-200">ランク</th>
                                                <th className="px-4 py-3 border-b border-slate-200">タグ</th>
                                                <th className="px-4 py-3 border-b border-slate-200">住所</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {previewData.slice(0, 50).map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-slate-900">{row.full_name}</div>
                                                        <div className="text-[10px] text-slate-400">{row.name_kana}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{row.email}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.gender === '女性' || row.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {row.gender || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{row.birth_date || "-"}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.rank || "Bronze"}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {row.tags?.split(/[,，]/).slice(0, 2).map((tag: string, j: number) => (
                                                                <span key={j} className="bg-slate-100 text-[10px] px-1.5 py-0.5 rounded text-slate-500">{tag.trim()}</span>
                                                            ))}
                                                            {row.tags?.split(/[,，]/).length > 2 && <span className="text-[10px] text-slate-400">...</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[150px]">{row.address || "-"}</td>
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

                <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
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
                                登録中...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                {previewData.length}件のワーカーを登録
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
