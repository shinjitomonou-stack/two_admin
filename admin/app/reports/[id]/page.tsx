"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, MapPin, Calendar, CheckCircle, XCircle, FileText, Edit, X } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { updateReportStatusAction } from "@/app/actions/report";
import ImagePreviewModal from "@/components/ui/ImagePreviewModal";


export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState<string | null>(null);
    const [report, setReport] = useState<any>(null);
    const [template, setTemplate] = useState<any>(null);
    const [templateFields, setTemplateFields] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const router = useRouter();

    const supabase = createClient();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo') || '/reports';

    useEffect(() => {
        params.then(p => setId(p.id));
    }, [params]);

    useEffect(() => {
        if (id) {
            fetchReport();
        }
    }, [id]);

    const fetchReport = async () => {
        const { data: reportData, error } = await supabase
            .from("reports")
            .select(`
                *,
                job_applications (
                    job_id,
                    workers (
                        full_name,
                        email
                    ),
                    jobs (
                        title,
                        report_template_id
                    )
                )
            `)
            .eq("id", id)
            .single();

        if (error || !reportData) {
            console.error("Error fetching report:", error);
            setIsLoading(false);
            return;
        }

        setReport(reportData);

        // Fetch template if exists
        if (reportData.job_applications?.jobs?.report_template_id) {
            const { data: templateData } = await supabase
                .from("report_templates")
                .select("*")
                .eq("id", reportData.job_applications.jobs.report_template_id)
                .single();

            if (templateData) {
                setTemplate(templateData);
                setTemplateFields(templateData.fields || []);
            }
        }

        setIsLoading(false);
    };

    const handleApprove = async () => {
        if (!id) return;
        setIsProcessing(true);

        try {
            const result = await updateReportStatusAction(id, "APPROVED");

            if (!result.success) {
                toast.error("承認に失敗しました: " + (result.error as any)?.message);
            } else {
                toast.success("報告を承認しました");
                fetchReport(); // Refresh data
            }
        } catch (error: any) {
            toast.error("承認中にエラーが発生しました: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!id) return;
        setIsProcessing(true);

        try {
            const result = await updateReportStatusAction(id, "REJECTED");

            if (!result.success) {
                toast.error("差し戻しに失敗しました: " + (result.error as any)?.message);
            } else {
                toast.success("報告を差し戻しました");
                setShowRejectModal(false);
                setRejectionReason("");
                fetchReport(); // Refresh data
            }
        } catch (error: any) {
            toast.error("差し戻し中にエラーが発生しました: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getFieldLabel = (fieldId: string) => {
        const field = templateFields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
    };

    const formatCustomValue = (value: any, type?: string) => {
        if (value === true) return "はい";
        if (value === false) return "いいえ";
        if (Array.isArray(value)) return value.join(", ");
        return value;
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-500">読み込み中...</div>
                </div>
            </AdminLayout>
        );
    }

    if (!report) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-500">報告が見つかりません</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href={returnTo}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">作業報告詳細</h2>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <span>{report.job_applications.workers.full_name}</span>
                                <span>•</span>
                                <span>{report.job_applications.jobs.title}</span>
                                {template && (
                                    <>
                                        <span>•</span>
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                            {template.name}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <Link
                        href={`/reports/${id}/edit?returnTo=${encodeURIComponent(returnTo)}`}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Edit className="w-4 h-4" />
                        編集する
                    </Link>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Report Text */}
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-500" />
                                作業報告
                            </h3>
                            <div className="bg-slate-50 p-4 rounded-lg text-sm whitespace-pre-wrap text-slate-700">
                                {report.report_text || "報告内容なし"}
                            </div>
                        </div>

                        {/* Custom Fields */}
                        {Object.keys(report.custom_fields || {}).length > 0 && (
                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                                <h3 className="font-semibold">{template?.name || "詳細項目"}</h3>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    {Object.entries(report.custom_fields).map(([key, value]) => {
                                        const field = templateFields.find(f => f.id === key);
                                        const isPhoto = field?.type === 'photo' && Array.isArray(value);

                                        return (
                                            <div key={key} className={isPhoto ? "sm:col-span-2 space-y-2" : "space-y-1"}>
                                                <label className="text-xs font-medium text-muted-foreground">
                                                    {field?.label || key}
                                                </label>
                                                {isPhoto ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                                        {(value as string[]).map((url, idx) => (
                                                            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                                                                <img
                                                                    src={url}
                                                                    alt={`${field.label} ${idx + 1}`}
                                                                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                                                    onClick={() => {
                                                                        setPreviewUrl(url);
                                                                        setIsPreviewOpen(true);
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm font-medium">
                                                        {formatCustomValue(value, field?.type)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Photos */}
                        {report.photo_urls && Array.isArray(report.photo_urls) && report.photo_urls.length > 0 && (
                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
                                <h3 className="font-semibold">添付写真</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {report.photo_urls.map((url: string, index: number) => (
                                        <div
                                            key={index}
                                            className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-zoom-in"
                                            onClick={() => {
                                                setPreviewUrl(url);
                                                setIsPreviewOpen(true);
                                            }}
                                        >
                                            <img
                                                src={url}
                                                alt={`Report photo ${index + 1}`}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-sm text-slate-900">作業実績</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">作業日時</label>
                                    <div className="mt-1 space-y-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>{formatDateTime(report.work_start_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm pl-6 text-slate-500">
                                            <span>↓</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span>{formatDateTime(report.work_end_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                {report.work_start_location && (
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">開始位置情報</label>
                                        <div className="flex items-center gap-2 text-sm mt-1">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            <span className="truncate text-slate-600">
                                                位置情報あり
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100">
                                    <label className="text-xs font-medium text-muted-foreground">ステータス</label>
                                    <div className="mt-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${report.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                            report.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {report.status === 'APPROVED' ? '承認済み' :
                                                report.status === 'REJECTED' ? '差し戻し' : '提出済み'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {report.status === 'SUBMITTED' && (
                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-3">
                                <button
                                    onClick={handleApprove}
                                    disabled={isProcessing}
                                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    報告を承認
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(true)}
                                    disabled={isProcessing}
                                    className="w-full flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <XCircle className="w-4 h-4" />
                                    差し戻し
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ImagePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => {
                    setIsPreviewOpen(false);
                    setPreviewUrl(null);
                }}
                imageUrl={previewUrl || ""}
            />

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">報告を差し戻し</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            差し戻しの理由を入力してください（任意）
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="例：写真が不鮮明なため、再提出をお願いします"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm min-h-[100px] mb-4"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason("");
                                }}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                差し戻し
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
