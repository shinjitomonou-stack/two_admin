"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, Calendar, Clock, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FieldType = "text" | "textarea" | "number" | "select" | "checkbox" | "photo";

type CustomField = {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    placeholder?: string;
    options?: string[];
};

type ReportFormProps = {
    applicationId: string;
    jobId: string;
    template?: {
        id: string;
        fields: CustomField[];
    };
    defaultValues?: {
        scheduledStart?: string;
        scheduledEnd?: string;
    };
};

export default function ReportForm({ applicationId, jobId, template, defaultValues }: ReportFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    // Form states
    const [workStart, setWorkStart] = useState(defaultValues?.scheduledStart || "");
    const [workEnd, setWorkEnd] = useState(defaultValues?.scheduledEnd || "");
    const [reportText, setReportText] = useState("");
    const [customFields, setCustomFields] = useState<Record<string, any>>({});

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${applicationId}/${fileName}`;

        const supabase = createClient();

        try {
            const { error: uploadError } = await supabase.storage
                .from('report-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('report-photos')
                .getPublicUrl(filePath);

            setPhotos([...photos, data.publicUrl]);
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('写真のアップロードに失敗しました');
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/api/reports", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    applicationId,
                    workStart,
                    workEnd,
                    reportText,
                    photoUrls: photos,
                    customFields,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "報告の送信に失敗しました");
            }

            alert("作業報告を提出しました");
            router.push(`/jobs/${jobId}`);
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-2">
                    基本情報
                </h3>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            作業開始日時 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={workStart}
                            onChange={(e) => setWorkStart(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            作業終了日時 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            required
                            value={workEnd}
                            onChange={(e) => setWorkEnd(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                        作業内容・コメント <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        required
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder="作業内容や気づいた点などを入力してください"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                        写真
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {photos.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                                <img src={url} alt={`Report photo ${index + 1}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <label className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                            {uploading ? (
                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            ) : (
                                <>
                                    <Upload className="w-6 h-6 text-slate-400" />
                                    <span className="text-xs text-slate-500 mt-1">追加</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* Custom Fields */}
            {template && template.fields.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="font-bold text-lg text-slate-900 border-b border-slate-100 pb-2">
                        詳細報告 ({template.fields.length}項目)
                    </h3>

                    <div className="space-y-6">
                        {template.fields.map((field) => (
                            <div key={field.id} className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>

                                {field.type === "text" && (
                                    <input
                                        type="text"
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={customFields[field.id] || ""}
                                        onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}

                                {field.type === "textarea" && (
                                    <textarea
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={customFields[field.id] || ""}
                                        onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                    />
                                )}

                                {field.type === "number" && (
                                    <input
                                        type="number"
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={customFields[field.id] || ""}
                                        onChange={(e) => setCustomFields({ ...customFields, [field.id]: Number(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}

                                {field.type === "select" && (
                                    <select
                                        required={field.required}
                                        value={customFields[field.id] || ""}
                                        onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">選択してください</option>
                                        {field.options?.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                )}

                                {field.type === "checkbox" && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={field.id}
                                            checked={customFields[field.id] || false}
                                            onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor={field.id} className="text-sm text-slate-700 cursor-pointer">
                                            はい
                                        </label>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading || uploading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        送信中...
                    </div>
                ) : (
                    "作業報告を提出する"
                )}
            </button>
        </form>
    );
}
