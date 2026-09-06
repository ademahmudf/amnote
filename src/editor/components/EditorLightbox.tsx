import React, { useEffect } from 'react';
import { ZoomOut, ZoomIn, Copy, Check, Download, X } from 'lucide-react';
import { notify } from '../../store/useNotificationStore';
import { clampZoom } from '../utils/editorTriggers';

export interface LightboxImageData {
  src: string;
  alt?: string;
}

export interface EditorLightboxProps {
  image: LightboxImageData | null;
  zoom: number;
  onZoomChange: (zoom: number | ((prev: number) => number)) => void;
  onClose: () => void;
  copied: boolean;
  onSetCopied: (copied: boolean) => void;
}

export const EditorLightbox: React.FC<EditorLightboxProps> = ({
  image,
  zoom,
  onZoomChange,
  onClose,
  copied,
  onSetCopied,
}) => {
  useEffect(() => {
    if (!image) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(image.src);
    onSetCopied(true);
    setTimeout(() => onSetCopied(false), 1500);
    notify({
      title: 'AmNote Attachment',
      sender: 'Clipboard',
      message: 'Image URL copied to clipboard',
      type: 'success',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Lightbox Controls */}
        <div className="absolute -top-12 right-0 flex items-center gap-2">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => onZoomChange((prev) => clampZoom(prev - 0.25))}
            title="Zoom Out"
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <ZoomOut size={16} />
          </button>

          {/* Reset Zoom / Current Scale */}
          <button
            type="button"
            onClick={() => onZoomChange(1)}
            title="Reset Zoom"
            className="px-2.5 py-1 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md text-xs font-mono transition-all cursor-pointer"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => onZoomChange((prev) => clampZoom(prev + 0.25))}
            title="Zoom In"
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <ZoomIn size={16} />
          </button>

          {/* Copy Image / Link */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Image Data / URL"
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>

          {/* Download Image */}
          <a
            href={image.src}
            download={image.alt || 'amnote-image'}
            title="Download Image"
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center"
          >
            <Download size={16} />
          </a>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-2 rounded-xl bg-black/60 hover:bg-rose-600 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Lightbox Image Element */}
        <div className="overflow-auto max-h-[85vh] max-w-[90vw] flex items-center justify-center p-2">
          <img
            src={image.src}
            alt={image.alt}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            className="rounded-2xl max-h-[80vh] max-w-full object-contain shadow-2xl transition-transform duration-150 border border-white/10"
          />
        </div>
      </div>
    </div>
  );
};
