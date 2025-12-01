import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, Edit } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !client) {
        notFound();
    }

    // Fetch related jobs (optional, but good for detail view)
    const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/clients"
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">{client.name}</h2>
                            <p className="text-muted-foreground text-xs font-mono">ID: {client.id}</p>
                        </div>
                    </div>
                    <Link
                        href={`/clients/${client.id}/edit`}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        <Edit className="w-4 h-4" />
                        編集する
                    </Link>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-slate-500" />
                                基本情報
                            </h3>

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">会社名</label>
                                    <div className="text-sm font-medium">{client.name}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">メールアドレス</label>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        {client.email}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">電話番号</label>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        {client.phone || "未登録"}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">登録日</label>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {formatDate(client.created_at)}
                                    </div>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">住所</label>
                                    <div className="flex items-start gap-2 text-sm">
                                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                        {client.address || "未登録"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Jobs History */}
                        <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
                            <h3 className="font-semibold text-lg">発注案件履歴</h3>

                            {jobs && jobs.length > 0 ? (
                                <div className="space-y-4">
                                    {jobs.map(job => (
                                        <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium text-slate-900">{job.title}</h4>
                                                <span className={`text-xs px-2 py-1 rounded-full ${job.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                                                    job.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {job.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(job.start_time)} 〜 {formatDate(job.end_time)}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">案件履歴はありません。</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
