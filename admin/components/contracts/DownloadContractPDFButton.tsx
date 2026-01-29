"use client";

import { Printer } from "lucide-react";

export default function DownloadContractPDFButton() {
    return (
        <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-lg border border-border shadow-sm hover:bg-slate-50 transition-colors font-medium print:hidden"
        >
            <Printer className="w-4 h-4" />
            PDFダウンロード
        </button>
    );
}
