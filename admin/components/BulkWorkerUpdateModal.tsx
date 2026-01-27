"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BulkWorkerUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BulkWorkerUpdateModal({ isOpen, onClose }: BulkWorkerUpdateModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        success: number;
        fail: number;
        skipped: number;
        message: string;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Simple CSV parser for preview
    const parseCSV = (text: string) => {
        if (!text.trim()) return [];
        const rows = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (rows.length < 2) return [];
        const headers = rows[0].split(",");
        const data = rows.slice(1).map(row => {
            const values = row.split(",");
            const obj: any = {};
            headers.forEach((header, i) => {
                obj[header.trim()] = values[i]?.trim() || "";
            });
            return obj;
        });
        return data;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);

            // Preview logic
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const data = parseCSV(text);
                setPreviewData(data);
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
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/workers/import", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "アップロードに失敗しました");
            }

            setResult({
                success: data.successCount,
                fail: data.failCount,
                skipped: data.skippedCount,
                message: data.message,
            });
            toast.success("インポート処理が完了しました");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
            <div className={`bg-white rounded-2xl shadow-xl w-full ${result ? 'max-w-lg' : 'max-w-6xl'} max-h-[90vh] flex flex-col transition-all duration-300`}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">ワーカー一括更新</h2>
                        <p className="text-sm text-slate-500">
                            CSVファイルをアップロードして、複数のワーカー情報を一度に更新します。
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {!result ? (
                        !file ? (
                            <div
                                onClick={handleUploadClick}
                                className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer group"
                            >
                                <div className="p-4 bg-slate-50 rounded-full group-hover:bg-white transition-colors">
                                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-slate-900">CSVファイルをアップロード</p>
                                    <p className="text-sm text-slate-500">メールアドレスが含まれるCSVを使用してください</p>
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
                                                    {previewData.length > 0 && Object.keys(previewData[0]).slice(0, 8).map((header) => (
                                                        <th key={header} className="px-3 py-2 border-b border-slate-200">{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewData.slice(0, 20).map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        {Object.values(row).slice(0, 8).map((val: any, j) => (
                                                            <td key={j} className="px-3 py-2 text-slate-600 truncate max-w-[150px]">
                                                                {val}
                                                            </td>
                                                        ))}
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
                        )
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 mb-2">更新完了</h4>
                                <p className="text-slate-500 text-sm">{result.message}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{result.success}</div>
                                    <div className="text-xs text-slate-500 font-bold mt-1">成功</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{result.fail}</div>
                                    <div className="text-xs text-slate-500 font-bold mt-1">失敗</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-slate-600">{result.skipped}</div>
                                    <div className="text-xs text-slate-500 font-bold mt-1">スキップ</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!result && (
                    <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!file || loading || previewData.length === 0}
                            className="px-8 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    更新中...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    {previewData.length}件のワーカーを更新
                                </>
                            )}
                        </button>
                    </div>
                )}

                {result && (
                    <div className="p-6 border-t border-slate-100 flex justify-center bg-slate-50/50">
                        <button
                            onClick={onClose}
                            className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                        >
                            閉じる
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
