"use client";

import { useState, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BulkWorkerUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BulkWorkerUpdateModal({ isOpen, onClose }: BulkWorkerUpdateModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        success: number;
        fail: number;
        skipped: number;
        message: string;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "エラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800">ワーカー一括更新（CSV）</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 leading-relaxed">
                        <h4 className="font-bold mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            インポートの手順
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
                            <li>CSVファイルの<strong>メールアドレス</strong>をキーにして更新します。</li>
                            <li>メールアドレスが一致するワーカーのみ更新されます。</li>
                            <li>値が<strong>空の項目は削除（NULL更新）</strong>されます。</li>
                            <li>値を維持したい場合は、現在の値を入力するか列を削除してください。</li>
                        </ul>
                    </div>

                    {!result ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    CSVファイルを選択
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <div className="text-sm font-medium text-slate-700">
                                        {file ? file.name : "クリックしてファイルを選択"}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        .csv ファイルのみアップロード可能
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={!file || loading}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    インポート実行
                                </button>
                            </div>
                        </form>
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
                                    <div className="text-xs text-slate-500 font-bold mt-1">スキップ/対象外</div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={onClose}
                                    className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
