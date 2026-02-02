import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthNavigatorProps {
    currentDate: Date;
    onChange: (date: Date) => void;
}

export function MonthNavigator({ currentDate, onChange }: MonthNavigatorProps) {
    const goToPreviousMonth = () => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        onChange(newDate);
    };

    const goToNextMonth = () => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        onChange(newDate);
    };

    const goToToday = () => {
        onChange(new Date());
    };

    return (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-4">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                    <Calendar className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 border-none p-0 bg-transparent">
                        {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                    </h3>
                    <p className="text-xs text-muted-foreground">表示期間の切り替え</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                    今月
                </button>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-2 hover:bg-slate-50 transition-colors border-r border-slate-200"
                        title="前月"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNextMonth}
                        className="p-2 hover:bg-slate-50 transition-colors"
                        title="次月"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
