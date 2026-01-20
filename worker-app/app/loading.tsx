import { JapaneseYen } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex h-[80vh] w-full items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-6">
                <div className="relative flex items-center justify-center">
                    {/* Outer rotating ring */}
                    <div className="h-16 w-16 rounded-full border-4 border-slate-200"></div>
                    <div className="absolute h-16 w-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>

                    {/* Inner icon with pulse */}
                    <div className="absolute animate-pulse bg-blue-50 p-2 rounded-full">
                        <JapaneseYen className="w-6 h-6 text-blue-600" />
                    </div>
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
