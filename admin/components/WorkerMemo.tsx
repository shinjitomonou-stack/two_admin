"use client";

import { useState } from "react";
import { Edit, X, Save, StickyNote } from "lucide-react";
import { updateWorkerAction } from "@/app/actions/worker";
import { toast } from "sonner";

interface WorkerMemoProps {
  workerId: string;
  initialMemo: string | null;
}

export default function WorkerMemo({ workerId, initialMemo }: WorkerMemoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [memo, setMemo] = useState(initialMemo || "");
  const [savedMemo, setSavedMemo] = useState(initialMemo || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateWorkerAction(workerId, { admin_memo: memo });
      if (result.success) {
        setSavedMemo(memo);
        setIsEditing(false);
        toast.success("メモを保存しました");
      } else {
        toast.error(result.error as string);
      }
    } catch {
      toast.error("メモの保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setMemo(savedMemo);
    setIsEditing(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-500" />
          メモ
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="ワーカーに関するメモを入力..."
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 min-h-[100px] resize-y"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-600 whitespace-pre-wrap">
          {savedMemo || <span className="text-slate-400">メモなし</span>}
        </div>
      )}
    </div>
  );
}
