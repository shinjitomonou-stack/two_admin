import AdminLayout from "@/components/layout/AdminLayout";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Mail, Calendar, Trash2, Shield } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { DeleteAdminButton } from "@/components/DeleteAdminButton";

export default async function AdminUsersPage() {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all admin users
    const { data: admins, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching admins:", error);
    }

    const roleLabels: { [key: string]: string } = {
        SYSTEM: "システム管理者",
        ADMIN: "管理者",
        USER: "ユーザー",
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">管理者管理</h2>
                        <p className="text-muted-foreground">
                            管理者アカウントの追加・削除を行います。
                        </p>
                    </div>
                    <Link
                        href="/settings/admins/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        新規管理者追加
                    </Link>
                </div>

                {/* Admin List */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-border text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">メールアドレス</th>
                                    <th className="px-6 py-3 font-medium">ロール</th>
                                    <th className="px-6 py-3 font-medium">登録日</th>
                                    <th className="px-6 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {admins?.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium text-slate-900">
                                                    {admin.email}
                                                </span>
                                                {admin.id === user?.id && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                        現在のユーザー
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-semibold",
                                                admin.role === 'SYSTEM' ? "bg-purple-100 text-purple-700" :
                                                    admin.role === 'ADMIN' ? "bg-blue-100 text-blue-700" :
                                                        "bg-slate-100 text-slate-700"
                                            )}>
                                                {roleLabels[admin.role] || admin.role || "ユーザー"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(admin.created_at)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {admin.id !== user?.id ? (
                                                <DeleteAdminButton adminId={admin.id} adminEmail={admin.email} />
                                            ) : (
                                                <span className="text-xs text-slate-400">削除不可</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(!admins || admins.length === 0) && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                            管理者が登録されていません。
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
