import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Check,
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop as CropIcon,
  RefreshCw,
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
}

type AspectRatio = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '9:16';

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onSave,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 100, height: 100 });

  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | null>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; cropBox: CropBox }>({
    clientX: 0,
    clientY: 0,
    cropBox: { x: 0, y: 0, width: 0, height: 0 },
  });

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initCropBox = useCallback((imgW: number, imgH: number, ratio: AspectRatio) => {
    let targetW = imgW * 0.85;
    let targetH = imgH * 0.85;

    if (ratio === '1:1') {
      const minDim = Math.min(targetW, targetH);
      targetW = minDim;
      targetH = minDim;
    } else if (ratio === '16:9') {
      targetH = targetW * (9 / 16);
      if (targetH > imgH * 0.9) {
        targetH = imgH * 0.85;
        targetW = targetH * (16 / 9);
      }
    } else if (ratio === '4:3') {
      targetH = targetW * (3 / 4);
      if (targetH > imgH * 0.9) {
        targetH = imgH * 0.85;
        targetW = targetH * (4 / 3);
      }
    } else if (ratio === '3:2') {
      targetH = targetW * (2 / 3);
      if (targetH > imgH * 0.9) {
        targetH = imgH * 0.85;
        targetW = targetH * (3 / 2);
      }
    } else if (ratio === '9:16') {
      targetW = targetH * (9 / 16);
      if (targetW > imgW * 0.9) {
        targetW = imgW * 0.85;
        targetH = targetW * (16 / 9);
      }
    }

    const x = Math.max(0, (imgW - targetW) / 2);
    const y = Math.max(0, (imgH - targetH) / 2);

    setCropBox({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(targetW),
      height: Math.round(targetH),
    });
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplayedSize({ width: img.clientWidth, height: img.clientHeight });
    initCropBox(img.clientWidth, img.clientHeight, aspectRatio);
  };

  // Recalculate crop box when aspect ratio changes
  const handleRatioChange = (newRatio: AspectRatio) => {
    setAspectRatio(newRatio);
    if (displayedSize.width > 0 && displayedSize.height > 0) {
      initCropBox(displayedSize.width, displayedSize.height, newRatio);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, action: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragAction(action);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      cropBox: { ...cropBox },
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragAction || !imageRef.current) return;

      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;
      const orig = dragStartRef.current.cropBox;
      const maxW = displayedSize.width;
      const maxH = displayedSize.height;

      let newX = orig.x;
      let newY = orig.y;
      let newW = orig.width;
      let newH = orig.height;

      if (dragAction === 'move') {
        newX = Math.max(0, Math.min(maxW - orig.width, orig.x + deltaX));
        newY = Math.max(0, Math.min(maxH - orig.height, orig.y + deltaY));
      } else {
        if (dragAction.includes('e')) {
          newW = Math.max(30, Math.min(maxW - orig.x, orig.width + deltaX));
        }
        if (dragAction.includes('s')) {
          newH = Math.max(30, Math.min(maxH - orig.y, orig.height + deltaY));
        }
        if (dragAction.includes('w')) {
          const potentialW = orig.width - deltaX;
          if (potentialW >= 30 && orig.x + deltaX >= 0) {
            newX = orig.x + deltaX;
            newW = potentialW;
          }
        }
        if (dragAction.includes('n')) {
          const potentialH = orig.height - deltaY;
          if (potentialH >= 30 && orig.y + deltaY >= 0) {
            newY = orig.y + deltaY;
            newH = potentialH;
          }
        }

        // Apply aspect ratio constraints if locked
        if (aspectRatio !== 'free') {
          let ratioVal = 1;
          if (aspectRatio === '1:1') ratioVal = 1;
          else if (aspectRatio === '16:9') ratioVal = 16 / 9;
          else if (aspectRatio === '4:3') ratioVal = 4 / 3;
          else if (aspectRatio === '3:2') ratioVal = 3 / 2;
          else if (aspectRatio === '9:16') ratioVal = 9 / 16;

          if (['e', 'w', 'se', 'ne'].includes(dragAction)) {
            newH = Math.min(maxH - newY, newW / ratioVal);
          } else {
            newW = Math.min(maxW - newX, newH * ratioVal);
          }
        }
      }

      setCropBox({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    },
    [isDragging, dragAction, displayedSize, aspectRatio]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragAction(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Execute Canvas Crop and output Data URL
  const handleApplyCrop = () => {
    if (!imageRef.current || displayedSize.width === 0 || displayedSize.height === 0) return;

    const scaleX = imgNaturalSize.width / displayedSize.width;
    const scaleY = imgNaturalSize.height / displayedSize.height;

    const cropX = cropBox.x * scaleX;
    const cropY = cropBox.y * scaleY;
    const cropWidth = cropBox.width * scaleX;
    const cropHeight = cropBox.height * scaleY;

    const canvas = document.createElement('canvas');
    const isRotated90or270 = rotation === 90 || rotation === 270;
    canvas.width = isRotated90or270 ? cropHeight : cropWidth;
    canvas.height = isRotated90or270 ? cropWidth : cropHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();

    // Handle rotation & flips
    if (isRotated90or270) {
      ctx.translate(cropHeight / 2, cropWidth / 2);
    } else {
      ctx.translate(cropWidth / 2, cropHeight / 2);
    }

    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const img = imageRef.current;
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      -cropWidth / 2,
      -cropHeight / 2,
      cropWidth,
      cropHeight
    );

    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/png', 0.95);
    onSave(croppedDataUrl);
    onClose();
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectRatio('free');
    if (displayedSize.width > 0 && displayedSize.height > 0) {
      initCropBox(displayedSize.width, displayedSize.height, 'free');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-divider)' }}>
          <div className="flex items-center gap-2">
            <CropIcon size={16} className="text-accent" style={{ color: 'var(--color-accent)' }} />
            <h2 className="font-semibold text-xs">Crop & Transform Image</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>

        {/* Workspace Canvas Area */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-black/30 min-h-[380px] max-h-[60vh] relative">
          <div ref={containerRef} className="relative inline-block select-none max-w-full max-h-full">
            {/* Base Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              style={{
                transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                maxHeight: '52vh',
                maxWidth: '100%',
              }}
              className="block object-contain rounded-lg pointer-events-none transition-transform duration-150"
            />

            {/* Dark Mask around crop box */}
            {displayedSize.width > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'rgba(0, 0, 0, 0.55)',
                  clipPath: `polygon(
                    0% 0%, 0% 100%, 
                    ${cropBox.x}px 100%, 
                    ${cropBox.x}px ${cropBox.y}px, 
                    ${cropBox.x + cropBox.width}px ${cropBox.y}px, 
                    ${cropBox.x + cropBox.width}px ${cropBox.y + cropBox.height}px, 
                    ${cropBox.x}px ${cropBox.y + cropBox.height}px, 
                    ${cropBox.x}px 100%, 
                    100% 100%, 100% 0%
                  )`,
                }}
              />
            )}

            {/* Interactive Crop Frame */}
            {displayedSize.width > 0 && (
              <div
                style={{
                  left: `${cropBox.x}px`,
                  top: `${cropBox.y}px`,
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                }}
                className="absolute border-2 border-white shadow-2xl cursor-move select-none"
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Rule of Thirds Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-r border-b border-white/60" />
                  <div className="border-b border-white/60" />
                  <div className="border-r border-white/60" />
                  <div className="border-r border-white/60" />
                  <div />
                </div>

                {/* 4 Corner Resize Handles */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'nw')}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-accent border-2 border-white rounded-xs cursor-nwse-resize shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'ne')}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-accent border-2 border-white rounded-xs cursor-nesw-resize shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-accent border-2 border-white rounded-xs cursor-nwse-resize shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-accent border-2 border-white rounded-xs cursor-nesw-resize shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />

                {/* 4 Edge Resize Handles */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'n')}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-accent border border-white rounded-full cursor-ns-resize shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 's')}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-2 bg-accent border border-white rounded-full cursor-ns-resize shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'w')}
                  className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-5 bg-accent border border-white rounded-full cursor-ew-resize shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'e')}
                  className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-5 bg-accent border border-white rounded-full cursor-ew-resize shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                />

                {/* Real-time Dimensions Badge */}
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white pointer-events-none shadow-md">
                  {Math.round(cropBox.width * (imgNaturalSize.width / (displayedSize.width || 1)))} ×{' '}
                  {Math.round(cropBox.height * (imgNaturalSize.height / (displayedSize.height || 1)))} px
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar & Aspect Ratio Presets */}
        <div className="px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderColor: 'var(--color-divider)' }}>
          {/* Aspect Ratio Options */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] opacity-60 mr-1 font-semibold uppercase tracking-wider">Aspect:</span>
            {[
              { id: 'free', label: 'Free' },
              { id: '1:1', label: '1:1' },
              { id: '16:9', label: '16:9' },
              { id: '4:3', label: '4:3' },
              { id: '3:2', label: '3:2' },
              { id: '9:16', label: '9:16' },
            ].map((ratio) => (
              <button
                key={ratio.id}
                type="button"
                onClick={() => handleRatioChange(ratio.id as AspectRatio)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  aspectRatio === ratio.id
                    ? 'bg-accent text-white shadow-xs'
                    : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 border border-border/40'
                }`}
                style={{
                  backgroundColor: aspectRatio === ratio.id ? 'var(--color-accent)' : undefined,
                  color: aspectRatio === ratio.id ? 'var(--color-accent-text)' : undefined,
                }}
              >
                {ratio.label}
              </button>
            ))}
          </div>

          {/* Transform Controls (Rotate & Flip) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
              title="Rotate Left 90°"
              className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-all"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              title="Rotate Right 90°"
              className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-all"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <RotateCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setFlipH((prev) => !prev)}
              title="Flip Horizontal"
              className={`p-1.5 rounded-lg border transition-all ${
                flipH ? 'bg-accent text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: flipH ? 'var(--color-accent)' : undefined,
              }}
            >
              <FlipHorizontal size={14} />
            </button>
            <button
              type="button"
              onClick={() => setFlipV((prev) => !prev)}
              title="Flip Vertical"
              className={`p-1.5 rounded-lg border transition-all ${
                flipV ? 'bg-accent text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: flipV ? 'var(--color-accent)' : undefined,
              }}
            >
              <FlipVertical size={14} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset Transformations"
              className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100 transition-all"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs font-semibold"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-white shadow-sm hover:opacity-90 active:scale-95 transition-all text-xs font-semibold"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-accent-text)',
              }}
            >
              <Check size={14} />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
