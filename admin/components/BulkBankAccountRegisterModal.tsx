"use client";

interface BulkBankAccountRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BulkBankAccountRegisterModal({ isOpen, onClose }: BulkBankAccountRegisterModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">口座情報一括登録（テスト）</h2>
                <p className="text-sm text-gray-600 mb-4">モーダルが正常に表示されています。</p>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                    閉じる
                </button>
            </div>
        </div>
    );
}
