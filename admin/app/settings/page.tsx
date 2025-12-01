import AdminLayout from "@/components/layout/AdminLayout";
import { Building2, User, Bell, ChevronRight } from "lucide-react";
import Link from "next/link";

const settingsItems = [
    {
        title: "自社情報設定",
        description: "契約書テンプレートで使用する自社名、住所、代表者名などを設定します。",
        icon: Building2,
        href: "/settings/company",
        color: "bg-blue-100 text-blue-600",
    },
    {
        title: "アカウント設定",
        description: "ログイン情報やプロフィール画像を変更します。",
        icon: User,
        href: "/settings/account",
        color: "bg-slate-100 text-slate-600",
        disabled: true, // Placeholder
    },
    {
        title: "通知設定",
        description: "メール通知やプッシュ通知の設定を行います。",
        icon: Bell,
        href: "/settings/notifications",
        color: "bg-orange-100 text-orange-600",
        disabled: true, // Placeholder
    },
];

export default function SettingsPage() {
    return (
        <AdminLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">設定</h2>
                    <p className="text-muted-foreground">
                        アプリケーションの各種設定を行います。
                    </p>
                </div>

                <div className="grid gap-4">
                    {settingsItems.map((item) => (
                        <Link
                            key={item.title}
                            href={item.disabled ? "#" : item.href}
                            className={`flex items-center gap-4 p-4 bg-white rounded-xl border border-border shadow-sm transition-all ${item.disabled
                                    ? "opacity-60 cursor-not-allowed"
                                    : "hover:shadow-md hover:border-slate-300"
                                }`}
                        >
                            <div className={`p-3 rounded-lg ${item.color}`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    {item.title}
                                    {item.disabled && (
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                            Coming Soon
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {item.description}
                                </p>
                            </div>
                            {!item.disabled && (
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
