import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                    <Loader2 className="absolute top-0 h-12 w-12 animate-spin text-primary" style={{ animationDuration: '1.5s' }} />
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-base font-bold text-slate-900 tracking-wider">読み込み中</p>
                    <p className="text-xs text-slate-500 mt-1">しばらくお待ちください...</p>
                </div>
            </div>
        </div>
    );
}
