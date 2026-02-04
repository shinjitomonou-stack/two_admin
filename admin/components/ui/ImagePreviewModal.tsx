"use client";

import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { useState, useEffect } from "react";

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    altText?: string;
}

export default function ImagePreviewModal({ isOpen, onClose, imageUrl, altText }: ImagePreviewModalProps) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setRotation(0);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleRotate = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRotation(prev => (prev + 90) % 360);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 transition-opacity duration-300"
            onClick={onClose}
        >
            <div className="absolute top-4 right-4 flex items-center gap-2 z-[110]">
                <div className="flex bg-white/10 backdrop-blur-md rounded-lg overflow-hidden border border-white/20">
                    <button
                        onClick={handleZoomIn}
                        className="p-2.5 hover:bg-white/10 text-white transition-colors"
                        title="拡大"
                    >
                        <ZoomIn className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-2.5 hover:bg-white/10 text-white transition-colors border-l border-white/10"
                        title="縮小"
                    >
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleRotate}
                        className="p-2.5 hover:bg-white/10 text-white transition-colors border-l border-white/10"
                        title="回転"
                    >
                        <RotateCw className="w-5 h-5" />
                    </button>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="p-2.5 bg-white/10 backdrop-blur-md hover:bg-red-500/20 text-white rounded-lg border border-white/20 transition-all group"
                    title="閉じる"
                >
                    <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            <div
                className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center transition-transform duration-300 ease-out"
                style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={imageUrl}
                    alt={altText || "プレビュー画像"}
                    className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm"
                    draggable={false}
                />
            </div>

            {altText && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/10">
                    {altText}
                </div>
            )}
        </div>
    );
}
