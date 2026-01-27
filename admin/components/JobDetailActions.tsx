"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteJob, duplicateJob } from "@/app/actions/job";
import { toast } from "sonner";
import { Copy, Trash2, Loader2, Edit } from "lucide-react";
import Link from "next/link";
import { JobCopyDialog } from "./JobCopyDialog";
import { createClient } from "@/lib/supabase/client";

interface JobDetailActionsProps {
    jobId: string;
}

export function JobDetailActions({ jobId }: JobDetailActionsProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [jobData, setJobData] = useState<{
        title: string;
        address_text: string;
        start_time: string;
        end_time: string;
        assignedWorkerIds: string[];
    } | null>(null);
    const router = useRouter();

    const fetchJobData = async () => {
        const supabase = createClient();

        // Fetch job details
        const { data: job } = await supabase
            .from("jobs")
            .select("title, address_text, start_time, end_time")
            .eq("id", jobId)
            .single();

        // Fetch assigned workers
        const { data: applications } = await supabase
            .from("job_applications")
            .select("worker_id")
            .eq("job_id", jobId)
            .in("status", ["ASSIGNED", "CONFIRMED"]);

        if (job) {
            setJobData({
                title: job.title,
                address_text: job.address_text || "",
                start_time: job.start_time,
                end_time: job.end_time,
                assignedWorkerIds: applications?.map(app => app.worker_id) || [],
            });
        }
    };

    const handleDuplicateClick = async () => {
        await fetchJobData();
        setIsDialogOpen(true);
    };

    const handleCopy = async (data: { title: string; address_text: string; workerIds: string[]; start_time?: string; end_time?: string }) => {
        setIsProcessing(true);
        try {
            const result = await duplicateJob(jobId, {
                title: data.title,
                address_text: data.address_text,
                workerIds: data.workerIds,
                start_time: data.start_time,
                end_time: data.end_time,
            });
            if (result.success) {
                toast.success("案件を複製しました");
                setIsDialogOpen(false);
                router.push(`/jobs/${result.data.id}`);
            } else {
                toast.error("案件の複製に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("本当にこの案件を削除しますか?\nこの案件に紐付く「応募データ」「作業報告」「契約書」などもすべて削除されます。\nこの操作は取り消せません。")) return;
        setIsProcessing(true);
        try {
            const result = await deleteJob(jobId);
            if (result.success) {
                toast.success("案件を削除しました");
                router.push("/jobs");
            } else {
                toast.error("案件の削除に失敗しました");
            }
        } catch (error) {
            console.error(error);
            toast.error("エラーが発生しました");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleDuplicateClick}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                    複製
                </button>
                <button
                    onClick={handleDelete}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <Trash2 className="w-4 h-4" />
                    削除
                </button>
                <Link
                    href={`/jobs/${jobId}/edit?returnTo=/jobs/${jobId}`}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                    <Edit className="w-4 h-4" />
                    編集する
                </Link>
            </div>

            {jobData && (
                <JobCopyDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onCopy={handleCopy}
                    defaultTitle={jobData.title}
                    defaultAddress={jobData.address_text}
                    defaultStartDate={jobData.start_time}
                    defaultEndDate={jobData.end_time}
                    assignedWorkerIds={jobData.assignedWorkerIds}
                />
            )}
        </>
    );
}
