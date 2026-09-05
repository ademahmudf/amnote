import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Maximize2,
  Crop as CropIcon,
} from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';

export const ResizableImageView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const { src, alt, width = '100%', alignment = 'center' } = node.attrs;
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'left' | 'right' | null>(null);
  const [currentWidth, setCurrentWidth] = useState<string>(width || '100%');
  const [livePixelWidth, setLivePixelWidth] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const currentWidthRef = useRef<string>(width || '100%');

  useEffect(() => {
    setCurrentWidth(width || '100%');
    currentWidthRef.current = width || '100%';
  }, [width]);

  // Click outside listener to deselect image toolbar
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsActive(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleAlignmentChange = (newAlign: 'left' | 'center' | 'right') => {
    updateAttributes({ alignment: newAlign });
  };

  const handlePresetWidth = (newWidth: string) => {
    setCurrentWidth(newWidth);
    currentWidthRef.current = newWidth;
    updateAttributes({ width: newWidth });
  };

  const handleOpenLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    const event = new CustomEvent('amnote:open-lightbox', {
      detail: { src, alt: alt || 'Image' },
    });
    window.dispatchEvent(event);
  };

  const handleMouseDown = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setIsActive(true);
    setResizeDirection(direction);
    startXRef.current = e.clientX;

    if (imgRef.current) {
      startWidthRef.current = imgRef.current.offsetWidth;
      setLivePixelWidth(imgRef.current.offsetWidth);
    }

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const editorContainer = containerRef.current.closest('.ProseMirror') || containerRef.current.parentElement;
      const parentWidth = editorContainer?.clientWidth || 800;
      const deltaX = e.clientX - startXRef.current;
      const factor = resizeDirection === 'right' ? 1 : -1;
      const newPixelWidth = Math.max(120, Math.min(parentWidth, startWidthRef.current + deltaX * factor));

      const percentage = Math.round((newPixelWidth / parentWidth) * 100);
      const clampedPct = Math.max(15, Math.min(100, percentage));
      const widthStr = clampedPct >= 98 ? '100%' : `${clampedPct}%`;

      setLivePixelWidth(Math.round(newPixelWidth));
      setCurrentWidth(widthStr);
      currentWidthRef.current = widthStr;
    },
    [isResizing, resizeDirection]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeDirection(null);
      setLivePixelWidth(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      updateAttributes({ width: currentWidthRef.current });
    }
  }, [isResizing, updateAttributes]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Determine alignment CSS
  let alignContainerClass = 'justify-center';
  if (alignment === 'left') alignContainerClass = 'justify-start';
  if (alignment === 'right') alignContainerClass = 'justify-end';

  const showToolbar = isHovered || isActive || selected || isResizing;

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`am-resizable-image-wrapper pt-8 pb-2 -mt-5 flex ${alignContainerClass} relative group select-none`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isResizing && setIsHovered(false)}
      onClick={() => setIsActive(true)}
    >
      <div
        ref={containerRef}
        className="relative inline-block transition-all duration-75"
        style={{ width: currentWidth, maxWidth: '100%' }}
      >
        {/* Image Display */}
        <div className="relative overflow-hidden rounded-xl group/img">
          <img
            ref={imgRef}
            src={src}
            alt={alt || 'Note image'}
            onDoubleClick={handleOpenLightbox}
            className={`w-full h-auto block rounded-xl border object-contain cursor-default transition-all duration-150 shadow-sm ${
              showToolbar
                ? 'ring-2 ring-(--color-accent) border-(--color-accent) shadow-md'
                : 'hover:shadow-md border-border/40'
            }`}
            style={{
              borderColor: showToolbar ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          />

          {/* Live Dimension Badge while Resizing */}
          {isResizing && livePixelWidth && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none rounded-xl">
              <span className="px-3 py-1.5 rounded-lg bg-black/90 text-white font-mono text-xs font-semibold shadow-2xl border border-white/10">
                {livePixelWidth}px ({currentWidth})
              </span>
            </div>
          )}
        </div>

        {/* Floating Contextual Toolbar */}
        {showToolbar && (
          <div
            className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-xl shadow-2xl border backdrop-blur-xl z-30 animate-in fade-in zoom-in-95 duration-100"
            style={{
              backgroundColor: 'var(--card-notelist-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--text-editor)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Size Presets */}
            <div className="flex items-center gap-0.5 pr-1 border-r" style={{ borderColor: 'var(--color-divider)' }}>
              {[
                { label: '25%', val: '25%' },
                { label: '50%', val: '50%' },
                { label: '75%', val: '75%' },
                { label: '100%', val: '100%' },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handlePresetWidth(preset.val)}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-all ${
                    currentWidth === preset.val
                      ? 'bg-(--color-accent) text-white shadow-xs'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: currentWidth === preset.val ? 'var(--color-accent)' : undefined,
                    color: currentWidth === preset.val ? 'var(--color-accent-text)' : undefined,
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Alignment Buttons */}
            <div className="flex items-center gap-0.5 pr-1 border-r" style={{ borderColor: 'var(--color-divider)' }}>
              <button
                type="button"
                onClick={() => handleAlignmentChange('left')}
                title="Align Left"
                className={`p-1 rounded text-xs transition-all ${
                  alignment === 'left'
                    ? 'bg-(--color-accent) text-white font-bold'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: alignment === 'left' ? 'var(--color-accent)' : undefined,
                  color: alignment === 'left' ? 'var(--color-accent-text)' : undefined,
                }}
              >
                <AlignLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleAlignmentChange('center')}
                title="Align Center"
                className={`p-1 rounded text-xs transition-all ${
                  alignment === 'center'
                    ? 'bg-(--color-accent) text-white font-bold'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: alignment === 'center' ? 'var(--color-accent)' : undefined,
                  color: alignment === 'center' ? 'var(--color-accent-text)' : undefined,
                }}
              >
                <AlignCenter size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleAlignmentChange('right')}
                title="Align Right"
                className={`p-1 rounded text-xs transition-all ${
                  alignment === 'right'
                    ? 'bg-(--color-accent) text-white font-bold'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: alignment === 'right' ? 'var(--color-accent)' : undefined,
                  color: alignment === 'right' ? 'var(--color-accent-text)' : undefined,
                }}
              >
                <AlignRight size={13} />
              </button>
            </div>

            {/* Crop Button */}
            <button
              type="button"
              onClick={() => setIsCropOpen(true)}
              title="Crop & Transform Image"
              className="p-1 rounded text-xs opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <CropIcon size={13} />
            </button>

            {/* Zoom Lightbox */}
            <button
              type="button"
              onClick={handleOpenLightbox}
              title="Fullscreen Preview (or Double-Click)"
              className="p-1 rounded text-xs opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <Maximize2 size={13} />
            </button>

            {/* Delete Node */}
            <button
              type="button"
              onClick={deleteNode}
              title="Delete Image"
              className="p-1 rounded text-xs text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {/* Left Drag Handle */}
        {showToolbar && (
          <div
            onMouseDown={(e) => handleMouseDown(e, 'left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-3.5 h-10 bg-(--color-accent) text-white rounded-full flex items-center justify-center cursor-ew-resize shadow-xl z-20 transition-transform hover:scale-125 active:scale-95 border border-white/20"
            title="Drag left to resize"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <div className="w-0.5 h-4 bg-white/90 rounded-full" />
          </div>
        )}

        {/* Right Drag Handle */}
        {showToolbar && (
          <div
            onMouseDown={(e) => handleMouseDown(e, 'right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-10 bg-(--color-accent) text-white rounded-full flex items-center justify-center cursor-ew-resize shadow-xl z-20 transition-transform hover:scale-125 active:scale-95 border border-white/20"
            title="Drag right to resize"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <div className="w-0.5 h-4 bg-white/90 rounded-full" />
          </div>
        )}
      </div>

      {/* Image Crop & Transformation Modal */}
      {isCropOpen && (
        <ImageCropModal
          isOpen={isCropOpen}
          imageSrc={src}
          onClose={() => setIsCropOpen(false)}
          onSave={(newSrc) => updateAttributes({ src: newSrc })}
        />
      )}
    </NodeViewWrapper>
  );
};
