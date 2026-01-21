import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-6">
                <div className="relative flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                </div>

                <div className="space-y-1.5 text-center">
                    <p className="text-sm font-bold text-slate-900 tracking-wide">データを取得中</p>
                    <div className="flex justify-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
