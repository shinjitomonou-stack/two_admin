"use client";

import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl?: string; // Single image mode (backward compatibility)
    images?: string[]; // Multiple images mode
    initialIndex?: number;
    altText?: string;
}

export default function ImagePreviewModal({
    isOpen,
    onClose,
    imageUrl,
    images = [],
    initialIndex = 0,
    altText
}: ImagePreviewModalProps) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Determine the list of images to show
    const imageList = images.length > 0 ? images : (imageUrl ? [imageUrl] : []);
    const hasMultiple = imageList.length > 1;

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setRotation(0);
            setCurrentIndex(initialIndex);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, initialIndex]);

    const handleNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        if (hasMultiple) {
            setCurrentIndex(prev => (prev + 1) % imageList.length);
            setScale(1);
            setRotation(0);
        }
    }, [hasMultiple, imageList.length]);

    const handlePrev = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        if (hasMultiple) {
            setCurrentIndex(prev => (prev - 1 + imageList.length) % imageList.length);
            setScale(1);
            setRotation(0);
        }
    }, [hasMultiple, imageList.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleNext(e);
            if (e.key === "ArrowLeft") handlePrev(e);
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, handleNext, handlePrev, onClose]);

    if (!isOpen || imageList.length === 0) return null;

    const currentImage = imageList[currentIndex];

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
            {/* Header Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-[110]">
                {hasMultiple && (
                    <div className="mr-4 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full border border-white/10">
                        {currentIndex + 1} / {imageList.length}
                    </div>
                )}

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

            {/* Navigation Buttons */}
            {hasMultiple && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 z-[105] p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                        title="前へ"
                    >
                        <ChevronLeft className="w-10 h-10" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-4 z-[105] p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
                        title="次へ"
                    >
                        <ChevronRight className="w-10 h-10" />
                    </button>
                </>
            )}

            {/* Main Image */}
            <div
                className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center transition-transform duration-300 ease-out"
                style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={() => setScale(1)}
            >
                <img
                    src={currentImage}
                    alt={altText || `プレビュー画像 ${currentIndex + 1}`}
                    className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm selection:bg-transparent"
                    draggable={false}
                />
            </div>

            {/* Footer Caption */}
            {altText && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/10">
                    {altText} {hasMultiple ? `(${currentIndex + 1}/${imageList.length})` : ''}
                </div>
            )}
        </div>
    );
}
