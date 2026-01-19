"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    Settings,
    LogOut,
    Menu,
    Building2,
    FileSignature,
    Calendar as CalendarIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, Suspense } from "react";
import { logout } from "@/app/actions/auth";

const sidebarItems = [
    { icon: LayoutDashboard, label: "ダッシュボード", href: "/" },
    { icon: CalendarIcon, label: "カレンダー", href: "/calendar" },
    {
        icon: Briefcase,
        label: "案件管理",
        href: "/jobs",
        subItems: [
            { label: "案件一覧", href: "/jobs" },
            { label: "作業報告一覧", href: "/reports" },
            { label: "作業報告管理", href: "/report-templates" },
        ]
    },
    {
        icon: Users,
        label: "ワーカー管理",
        href: "/workers",
        subItems: [
            { label: "ワーカー", href: "/workers" },
            { label: "契約管理", href: "/contracts" },
            { label: "契約書テンプレート", href: "/contracts/templates" },
            { label: "支払金額集計", href: "/workers/payment" },
        ]
    },
    {
        icon: Building2,
        label: "クライアント",
        href: "/clients?trading_type=RECEIVING",
        subItems: [
            { label: "クライアント管理", href: "/clients?trading_type=RECEIVING" },
            { label: "契約管理 (受注)", href: "/clients/contracts?trading_type=RECEIVING" },
            { label: "請求金額集計", href: "/clients/billing?trading_type=RECEIVING" },
        ]
    },
    {
        icon: Building2,
        label: "パートナー",
        href: "/clients?trading_type=PLACING",
        subItems: [
            { label: "パートナー管理", href: "/clients?trading_type=PLACING" },
            { label: "契約管理 (発注)", href: "/clients/contracts?trading_type=PLACING" },
            { label: "支払金額集計", href: "/clients/payment?trading_type=PLACING" },
        ]
    },
    {
        icon: Settings,
        label: "設定",
        href: "/settings",
        subItems: [
            { label: "管理者管理", href: "/settings/admins" },
        ]
    },
];

function AdminLayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const tradingType = searchParams.get("trading_type");

    const toggleExpanded = (href: string) => {
        setExpandedItems(prev =>
            prev.includes(href)
                ? prev.filter(item => item !== href)
                : [...prev, href]
        );
    };

    // Automatically expand the menu item that contains the current path
    useEffect(() => {
        const activeParentHrefs = sidebarItems
            .filter(item => {
                const itemPath = item.href.split('?')[0];
                const itemParams = new URLSearchParams(item.href.split('?')[1] || "");
                const itemTradingType = itemParams.get("trading_type");

                const isPathMatch = itemPath === '/'
                    ? pathname === '/'
                    : (pathname === itemPath || pathname.startsWith(itemPath + "/"));

                // If the menu item has a trading_type, it must match the current URL's trading_type
                const isTypeMatch = !itemTradingType || itemTradingType === tradingType;

                return isPathMatch && isTypeMatch && item.subItems && (item.subItems.length > 0);
            })
            .map(item => item.href);

        if (activeParentHrefs.length > 0) {
            setExpandedItems(prev => {
                const missing = activeParentHrefs.filter(href => !prev.includes(href));
                if (missing.length === 0) return prev;
                return [...prev, ...missing];
            });
        }
    }, [pathname, tradingType]);

    return (
        <div className="min-h-screen bg-muted/30 flex">
            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-primary border-r border-primary/20 transition-transform duration-200 ease-in-out lg:translate-x-0 shadow-lg",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-16 flex items-center px-6 border-b border-primary-foreground/10">
                    <img src="/header-logo.png" alt="Teo Admin" className="h-8 w-auto" />
                </div>

                <div className="flex flex-col h-[calc(100vh-4rem)]">
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {sidebarItems.map((item) => {
                            const itemPath = item.href.split('?')[0];
                            const itemParams = new URLSearchParams(item.href.split('?')[1] || "");
                            const itemTradingType = itemParams.get("trading_type");

                            const isPathMatch = itemPath === '/'
                                ? pathname === '/'
                                : (pathname === itemPath || pathname.startsWith(itemPath + "/"));

                            const isActive = isPathMatch && (!itemTradingType || itemTradingType === tradingType);
                            const hasSubItems = item.subItems && item.subItems.length > 0;
                            const isExpanded = expandedItems.includes(item.href);

                            return (
                                <div key={item.href}>
                                    {hasSubItems ? (
                                        <>
                                            <button
                                                onClick={() => toggleExpanded(item.href)}
                                                className={cn(
                                                    "flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                                                    isActive
                                                        ? "bg-white text-primary shadow-sm"
                                                        : "text-primary-foreground/90 hover:bg-white/10 hover:text-primary-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon className="w-5 h-5 stroke-[2.5]" />
                                                    {item.label}
                                                </div>
                                                <svg
                                                    className={cn(
                                                        "w-4 h-4 transition-transform",
                                                        isExpanded ? "rotate-180" : ""
                                                    )}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {isExpanded && (
                                                <div className="ml-8 mt-1 space-y-1">
                                                    {item.subItems.map((subItem) => {
                                                        const subItemPath = subItem.href.split('?')[0];
                                                        const subItemParams = new URLSearchParams(subItem.href.split('?')[1] || "");
                                                        const subItemTradingType = subItemParams.get("trading_type");
                                                        const isSubActive = pathname === subItemPath && (!subItemTradingType || subItemTradingType === tradingType);

                                                        return (
                                                            <Link
                                                                key={subItem.href}
                                                                href={subItem.href}
                                                                onClick={() => setIsMobileMenuOpen(false)}
                                                                className={cn(
                                                                    "block px-3 py-2 rounded-lg text-sm transition-colors",
                                                                    isSubActive
                                                                        ? "bg-white/20 text-white font-bold"
                                                                        : "text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground font-medium"
                                                                )}
                                                            >
                                                                {subItem.label}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                                                isActive
                                                    ? "bg-white text-primary shadow-sm"
                                                    : "text-primary-foreground/90 hover:bg-white/10 hover:text-primary-foreground"
                                            )}
                                        >
                                            <item.icon className="w-5 h-5 stroke-[2.5]" />
                                            {item.label}
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-primary-foreground/10">
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-bold text-red-600 hover:bg-white/10 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            ログアウト
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 flex items-center px-4 border-b border-border bg-white dark:bg-slate-900">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 -ml-2 rounded-md hover:bg-muted"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-3 font-bold">Teo Admin</span>
                </header>

                <main className="flex-1 p-6 lg:p-8 overflow-auto">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        }>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </Suspense>
    );
}
