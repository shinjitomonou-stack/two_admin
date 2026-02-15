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
    existingReport?: {
        id: string;
        work_start_at: string;
        work_end_at: string;
        report_text: string;
        photo_urls: string[];
        custom_fields: Record<string, any>;
        feedback?: string;
    };
};

export default function ReportForm({ applicationId, jobId, template, defaultValues, existingReport }: ReportFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [photos, setPhotos] = useState<string[]>(existingReport?.photo_urls || []);
    const [uploading, setUploading] = useState(false);

    // Format existing datetime for datetime-local input
    const formatForInput = (dateStr: string | undefined) => {
        if (!dateStr) return "";
        return new Date(dateStr).toISOString().slice(0, 16);
    };

    // Form states - pre-fill from existingReport if available
    const [workStart, setWorkStart] = useState(
        existingReport ? formatForInput(existingReport.work_start_at) : (defaultValues?.scheduledStart || "")
    );
    const [workEnd, setWorkEnd] = useState(
        existingReport ? formatForInput(existingReport.work_end_at) : (defaultValues?.scheduledEnd || "")
    );
    const [reportText, setReportText] = useState(existingReport?.report_text || "");
    const [customFields, setCustomFields] = useState<Record<string, any>>(existingReport?.custom_fields || {});

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const files = Array.from(e.target.files);
        const newPhotoUrls: string[] = [];

        const supabase = createClient();

        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${applicationId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('report-photos')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('report-photos')
                    .getPublicUrl(filePath);

                newPhotoUrls.push(data.publicUrl);
            }

            setPhotos([...photos, ...newPhotoUrls]);
        } catch (error: any) {
            console.error('Error uploading photos:', error);
            alert(`写真のアップロードに失敗しました: ${error.message || '不明なエラー'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleCustomPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const files = Array.from(e.target.files);
        const newPhotoUrls: string[] = [];

        const supabase = createClient();

        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${applicationId}/custom/${fieldId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('report-photos')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('report-photos')
                    .getPublicUrl(filePath);

                newPhotoUrls.push(data.publicUrl);
            }

            const currentPhotos = customFields[fieldId] || [];
            setCustomFields({
                ...customFields,
                [fieldId]: Array.isArray(currentPhotos) ? [...currentPhotos, ...newPhotoUrls] : [...newPhotoUrls]
            });
        } catch (error: any) {
            console.error('Error uploading custom field photos:', error);
            alert(`写真のアップロードに失敗しました: ${error.message || '不明なエラー'}`);
        } finally {
            setUploading(false);
        }
    };

    const removeCustomPhoto = (fieldId: string, photoIndex: number) => {
        const currentPhotos = customFields[fieldId] || [];
        if (Array.isArray(currentPhotos)) {
            setCustomFields({
                ...customFields,
                [fieldId]: currentPhotos.filter((_, i) => i !== photoIndex)
            });
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required custom fields
        if (template) {
            for (const field of template.fields) {
                if (field.required) {
                    const val = customFields[field.id];
                    if (field.type === 'photo') {
                        if (!val || !Array.isArray(val) || val.length === 0) {
                            alert(`「${field.label}」は必須項目です。写真をアップロードしてください。`);
                            return;
                        }
                    } else if (field.type === 'checkbox') {
                        if (!val) {
                            alert(`「${field.label}」は必須項目です。チェックを入れてください。`);
                            return;
                        }
                    } else {
                        if ((val === undefined || val === null || String(val).trim() === '')) {
                            alert(`「${field.label}」は必須項目です。入力してください。`);
                            return;
                        }
                    }
                }
            }
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/reports", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    applicationId,
                    workStart: new Date(workStart).toISOString(),
                    workEnd: new Date(workEnd).toISOString(),
                    reportText,
                    photoUrls: photos,
                    customFields,
                    ...(existingReport ? { reportId: existingReport.id } : {}),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "報告の送信に失敗しました");
            }

            alert(existingReport ? "作業報告を再提出しました" : "作業報告を提出しました");
            router.replace("/");
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
                                multiple
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
                                        value={customFields[field.id] ?? ""}
                                        onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}

                                {field.type === "textarea" && (
                                    <textarea
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={customFields[field.id] ?? ""}
                                        onChange={(e) => setCustomFields({ ...customFields, [field.id]: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                    />
                                )}

                                {field.type === "number" && (
                                    <input
                                        type="number"
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        value={customFields[field.id] ?? ""}
                                        onChange={(e) => setCustomFields({
                                            ...customFields,
                                            [field.id]: e.target.value === "" ? "" : Number(e.target.value)
                                        })}
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

                                {field.type === "photo" && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {(customFields[field.id] || []).map((url: string, pIdx: number) => (
                                            <div key={pIdx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                                                <img src={url} alt={`${field.label} ${pIdx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeCustomPhoto(field.id, pIdx)}
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
                                                multiple
                                                className="hidden"
                                                onChange={(e) => handleCustomPhotoUpload(e, field.id)}
                                                disabled={uploading}
                                            />
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
                    existingReport ? "作業報告を再提出する" : "作業報告を提出する"
                )}
            </button>
        </form>
    );
}
