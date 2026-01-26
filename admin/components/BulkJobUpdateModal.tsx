"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Download } from "lucide-react";
import { bulkUpdateJobs } from "@/app/actions/job";
import { toast } from "sonner";

interface BulkJobUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BulkJobUpdateModal({ isOpen, onClose }: BulkJobUpdateModalProps) {
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
                obj[header.trim()] = row[index] || "";
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
            const result = await bulkUpdateJobs(previewData);
            if (result.success) {
                toast.success(`${result.count}件の案件を一括更新しました。`);
                onClose();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("一括更新中にエラーが発生しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">案件一括更新</h2>
                        <p className="text-sm text-slate-500">
                            エクスポートしたCSVを編集してアップロードすることで、複数の案件を一度に更新します。
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!file ? (
                        <div
                            onClick={handleUploadClick}
                            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer group"
                        >
                            <div className="p-4 bg-slate-50 rounded-full group-hover:bg-white transition-colors">
                                <Upload className="w-8 h-8 text-slate-400 group-hover:text-amber-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-semibold text-slate-900">CSVファイルをアップロード</p>
                                <p className="text-sm text-slate-500">IDが含まれるCSVを使用してください</p>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                            />
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
                                        <p className="text-xs text-slate-500">{previewData.length}件のデータ</p>
                                    </div>
                                </div>
                                <button onClick={handleRemoveFile} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[11px] text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium whitespace-nowrap">
                                            <tr>
                                                <th className="px-3 py-2 border-b border-slate-200">ID</th>
                                                <th className="px-3 py-2 border-b border-slate-200">タイトル</th>
                                                <th className="px-3 py-2 border-b border-slate-200">クライアント</th>
                                                <th className="px-3 py-2 border-b border-slate-200">種別</th>
                                                <th className="px-3 py-2 border-b border-slate-200">期間/日付</th>
                                                <th className="px-3 py-2 border-b border-slate-200">報酬</th>
                                                <th className="px-3 py-2 border-b border-slate-200">募集人数</th>
                                                <th className="px-3 py-2 border-b border-slate-200">ステータス</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {previewData.slice(0, 20).map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-3 py-2 text-slate-400 font-mono truncate max-w-[80px]">{row.id || "NEW"}</td>
                                                    <td className="px-3 py-2 font-medium text-slate-900">{row.title}</td>
                                                    <td className="px-3 py-2 text-slate-600">{row.client_name}</td>
                                                    <td className="px-3 py-2">
                                                        {row.is_flexible === "はい" ? "期間" : "固定"}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600">
                                                        {row.is_flexible === "はい" ? `${row.period_start}〜` : row.date}
                                                    </td>
                                                    <td className="px-3 py-2 font-bold text-slate-900">¥{(parseInt(row.reward_amount) || 0).toLocaleString()}</td>
                                                    <td className="px-3 py-2">{row.max_workers}人</td>
                                                    <td className="px-3 py-2">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{row.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {previewData.length > 20 && (
                                    <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-500 italic border-t border-slate-200">
                                        ほか {previewData.length - 20} 件...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors">
                        キャンセル
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!file || isParsing || isSubmitting || previewData.length === 0}
                        className="px-8 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                更新中...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                {previewData.length}件の案件を更新
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
