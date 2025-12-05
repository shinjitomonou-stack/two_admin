import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ServerPaginationProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
}

export default function ServerPagination({ currentPage, totalPages, baseUrl }: ServerPaginationProps) {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-white">
            <div className="text-sm text-muted-foreground">
                ページ {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
                <Link
                    href={`${baseUrl}?page=${currentPage - 1}`}
                    className={`p-2 rounded-md border border-input hover:bg-slate-50 transition-colors ${currentPage === 1 ? "opacity-50 pointer-events-none" : ""
                        }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Link>

                {startPage > 1 && (
                    <>
                        <Link
                            href={`${baseUrl}?page=1`}
                            className="px-3 py-1.5 rounded-md border border-input hover:bg-slate-50 text-sm transition-colors"
                        >
                            1
                        </Link>
                        {startPage > 2 && <span className="text-muted-foreground">...</span>}
                    </>
                )}

                {pages.map((page) => (
                    <Link
                        key={page}
                        href={`${baseUrl}?page=${page}`}
                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${page === currentPage
                                ? "bg-slate-900 text-white"
                                : "border border-input hover:bg-slate-50"
                            }`}
                    >
                        {page}
                    </Link>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="text-muted-foreground">...</span>}
                        <Link
                            href={`${baseUrl}?page=${totalPages}`}
                            className="px-3 py-1.5 rounded-md border border-input hover:bg-slate-50 text-sm transition-colors"
                        >
                            {totalPages}
                        </Link>
                    </>
                )}

                <Link
                    href={`${baseUrl}?page=${currentPage + 1}`}
                    className={`p-2 rounded-md border border-input hover:bg-slate-50 transition-colors ${currentPage === totalPages ? "opacity-50 pointer-events-none" : ""
                        }`}
                >
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}
