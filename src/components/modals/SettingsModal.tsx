import React, { useState } from 'react';
import {
  X,
  Palette,
  Type,
  Database,
  Check,
  Download,
  Sliders,
  Laptop,
  FolderOpen,
  FolderInput,
  RotateCcw,
  RefreshCw,
  Heart,
  LayoutGrid,
  GripHorizontal,
} from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useSettingsStore, type FontFamily, type EditorWidth, type UiScale } from '../../store/useSettingsStore';
import { THEMES } from '../../themes/themeDefinitions';
import { AmNoteLogo } from '../icons/AmNoteLogo';

export const SettingsModal: React.FC = () => {
  const isSettingsOpen = useNoteStore((state) => state.isSettingsOpen);
  const setSettingsOpen = useNoteStore((state) => state.setSettingsOpen);
  const notes = useNoteStore((state) => state.notes);
  const vaultPath = useNoteStore((state) => state.vaultPath);
  const openVaultInFileManager = useNoteStore((state) => state.openVaultInFileManager);
  const reloadFromDisk = useNoteStore((state) => state.reloadFromDisk);
  const pickAndChangeVault = useNoteStore((state) => state.pickAndChangeVault);
  const resetVaultToDefault = useNoteStore((state) => state.resetVaultToDefault);

  const {
    themeId,
    setTheme,
  } = useThemeStore();

  const [themeFilter, setThemeFilter] = useState<'all' | 'dark' | 'light'>('all');
  const {
    fontFamily,
    fontSize,
    lineHeight,
    editorWidth,
    paragraphSpacing,
    paragraphIndent,
    uiScale,
    previewLines,
    typewriterMode,
    wordGoal,
    defaultHighlightColor,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setEditorWidth,
    setParagraphSpacing,
    setParagraphIndent,
    setUiScale,
    setPreviewLines,
    setTypewriterMode,
    setWordGoal,
    setDefaultHighlightColor,
  } = useSettingsStore();

  const numericLineHeight =
    typeof lineHeight === 'number'
      ? lineHeight === 1.65 ? 1.35 : lineHeight
      : lineHeight === 'normal'
      ? 1.35
      : lineHeight === 'loose'
      ? 1.65
      : 1.35;

  const [activeTab, setActiveTab] = useState<'themes' | 'typography' | 'data'>('typography');
  const [isReloading, setIsReloading] = useState(false);
  const [isChangingVault, setIsChangingVault] = useState(false);

  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setPosition({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy,
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dragStartRef.current = null;
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  React.useEffect(() => {
    if (isSettingsOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isSettingsOpen]);

  const handlePickVault = async () => {
    setIsChangingVault(true);
    try {
      await pickAndChangeVault();
    } finally {
      setIsChangingVault(false);
    }
  };

  const handleResetVault = async () => {
    setIsChangingVault(true);
    try {
      await resetVaultToDefault();
    } finally {
      setIsChangingVault(false);
    }
  };

  if (!isSettingsOpen) return null;

  const fontOptions: { id: FontFamily; label: string; desc: string; preview: string; fontFamily: string }[] = [
    {
      id: 'clarika',
      label: 'Clarika',
      desc: 'Geometric & Humanist Grotesque',
      preview: 'The quick brown fox jumps over the lazy dog',
      fontFamily: '"Clarika", "Outfit", "Plus Jakarta Sans", sans-serif',
    },
    {
      id: 'bear-sans',
      label: 'Bear Sans',
      desc: 'Bear 2 Signature Geometric',
      preview: 'The quick brown fox jumps over the lazy dog',
      fontFamily: '"Plus Jakarta Sans", "Bear Sans UI", sans-serif',
    },
    {
      id: 'sans',
      label: 'Inter Sans',
      desc: 'Clean & Technical',
      preview: 'The quick brown fox jumps over the lazy dog',
      fontFamily: 'Inter, sans-serif',
    },
    {
      id: 'serif',
      label: 'Editorial Serif',
      desc: 'Warm Literary Book',
      preview: 'The quick brown fox jumps over the lazy dog',
      fontFamily: '"Newsreader", Georgia, serif',
    },
    {
      id: 'mono',
      label: 'JetBrains Mono',
      desc: 'Developer Monospace',
      preview: 'The quick brown fox jumps over the lazy dog',
      fontFamily: '"JetBrains Mono", monospace',
    },
    {
      id: 'system',
      label: 'System Native',
      desc: 'OS Default Typeface',
      preview: 'The quick brown fox jumps over the lazy dog',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  ];

  const widthOptions: { id: EditorWidth; label: string; desc: string }[] = [
    { id: 'narrow', label: 'Narrow', desc: '576px (Compact writing)' },
    { id: 'comfort', label: 'Comfort', desc: '768px (Standard Bear)' },
    { id: 'wide', label: 'Wide', desc: '960px (Broad canvas)' },
    { id: 'full', label: 'Full', desc: '100% (Edge-to-edge)' },
  ];

  const scaleOptions: { id: UiScale; label: string; desc: string }[] = [
    { id: 'compact', label: 'Compact', desc: '12px Menu & Lists' },
    { id: 'standard', label: 'Standard', desc: '13.5px Balanced' },
    { id: 'comfortable', label: 'Comfortable', desc: '15px High Readability' },
    { id: 'spacious', label: 'Spacious', desc: '16.5px Large & Crisp' },
  ];

  const previewLineOptions = [
    { count: 1, label: '1 Line', desc: 'Compact view' },
    { count: 2, label: '2 Lines', desc: 'Standard Bear' },
    { count: 3, label: '3 Lines', desc: 'Detailed preview' },
    { count: 4, label: '4 Lines', desc: 'Extended preview' },
  ];

  const handleReloadFromDisk = async () => {
    setIsReloading(true);
    await reloadFromDisk();
    setTimeout(() => setIsReloading(false), 400);
  };

  const handleExportAllMarkdown = () => {
    notes.forEach((note) => {
      if (note.isTrashed) return;
      const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)}.md`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 animate-in fade-in duration-150"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 relative"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-3.5 border-b flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
          style={{ borderColor: 'var(--color-divider)' }}
          onMouseDown={handleHeaderMouseDown}
          title="Click and drag to move window"
        >
          <div className="flex items-center gap-2.5">
            <GripHorizontal size={16} className="opacity-40 hover:opacity-100 transition-opacity" />
            <Sliders size={17} className="text-accent" style={{ color: 'var(--color-accent)' }} />
            <h2 className="font-bold text-sm">AmNote Preferences</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex border-b px-6 text-xs font-semibold gap-6 select-none"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'typography'
                ? 'border-accent text-accent'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'typography' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'typography' ? 'var(--color-accent)' : undefined,
            }}
          >
            <Type size={14} />
            <span>Typography & UI Scale</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('themes')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'themes'
                ? 'border-accent text-accent'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'themes' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'themes' ? 'var(--color-accent)' : undefined,
            }}
          >
            <Palette size={14} />
            <span>Themes & Omarchy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'data'
                ? 'border-accent text-accent'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'data' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'data' ? 'var(--color-accent)' : undefined,
            }}
          >
            <Database size={14} />
            <span>Vault & Storage</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-6">
          {/* TYPOGRAPHY & UI SCALE TAB */}
          {activeTab === 'typography' && (
            <div className="space-y-6">
              {/* App UI & Menu Scale */}
              <div className="space-y-3 p-4 rounded-2xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={15} className="text-accent" style={{ color: 'var(--color-accent)' }} />
                    <h3 className="font-bold text-xs">Menu & Preview Font Scale</h3>
                  </div>
                  <p className="text-[11px] opacity-60 mt-0.5">Adjust font size for the sidebar menu, note titles, and note list snippet previews.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {scaleOptions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setUiScale(s.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        uiScale === s.id
                          ? 'border-accent bg-accent/10 text-accent font-semibold ring-1 ring-accent'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                      }`}
                      style={{
                        borderColor: uiScale === s.id ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="text-xs font-semibold">{s.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note List Preview Lines */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-xs">Note List Preview Depth</h3>
                  <p className="text-[11px] opacity-60">Number of snippet lines to display in each note card.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {previewLineOptions.map((p) => (
                    <button
                      key={p.count}
                      type="button"
                      onClick={() => setPreviewLines(p.count)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        previewLines === p.count
                          ? 'border-accent bg-accent/10 text-accent font-semibold ring-1 ring-accent'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                      }`}
                      style={{
                        borderColor: previewLines === p.count ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="text-xs font-semibold">{p.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Font Family */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-xs">Editor Writing Typeface</h3>
                  <p className="text-[11px] opacity-60">Select your preferred writing font (Clarika, Bear Sans, Serif, Mono, etc.).</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fontOptions.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        fontFamily === f.id
                          ? 'border-accent bg-accent/5 ring-1 ring-accent'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                      }`}
                      style={{
                        borderColor: fontFamily === f.id ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">{f.label}</span>
                        {fontFamily === f.id && <Check size={12} className="text-accent" style={{ color: 'var(--color-accent)' }} />}
                      </div>
                      <div className="text-[10px] opacity-40 mb-1">{f.desc}</div>
                      <div
                        className="text-xs opacity-75 truncate"
                        style={{ fontFamily: f.fontFamily }}
                      >
                        {f.preview}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Slider & Presets */}
              <div className="space-y-3 p-4 rounded-2xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs">Font Size</h3>
                    <p className="text-[11px] opacity-60">Adjust editor font size scale.</p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold border border-accent/20">
                    {fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={32}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[13, 14, 16, 18, 20, 24, 28].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all ${
                        fontSize === size
                          ? 'border-accent bg-accent text-white font-bold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
                      }`}
                      style={{
                        borderColor: fontSize === size ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height Slider & Presets */}
              <div className="space-y-3 p-4 rounded-2xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs">Line Height</h3>
                    <p className="text-[11px] opacity-60">Vertical line height multiplier for editor text.</p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold border border-accent/20">
                    {numericLineHeight.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={1.1}
                  max={2.4}
                  step={0.05}
                  value={numericLineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { val: 1.15, label: 'Compact', desc: '1.15x' },
                    { val: 1.25, label: 'Tight', desc: '1.25x' },
                    { val: 1.35, label: 'Standard', desc: '1.35x' },
                    { val: 1.5, label: 'Relaxed', desc: '1.50x' },
                    { val: 1.65, label: 'Loose', desc: '1.65x' },
                  ].map((lh) => (
                    <button
                      key={lh.val}
                      type="button"
                      onClick={() => setLineHeight(lh.val)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        Math.abs(numericLineHeight - lh.val) < 0.03
                          ? 'border-accent bg-accent/10 text-accent font-semibold ring-1 ring-accent'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                      }`}
                      style={{
                        borderColor: Math.abs(numericLineHeight - lh.val) < 0.03 ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="text-xs font-semibold">{lh.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{lh.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Width / Canvas Width */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-xs">Line Width (Canvas Width)</h3>
                  <p className="text-[11px] opacity-60">Maximum horizontal width for writing column.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {widthOptions.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setEditorWidth(w.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        editorWidth === w.id
                          ? 'border-accent bg-accent/10 text-accent font-semibold ring-1 ring-accent'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                      }`}
                      style={{
                        borderColor: editorWidth === w.id ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="text-xs font-semibold">{w.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{w.desc.split(' ')[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paragraph Spacing Slider & Presets */}
              <div className="space-y-3 p-4 rounded-2xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs">Paragraph Spacing</h3>
                    <p className="text-[11px] opacity-60">Vertical gap between paragraphs.</p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold border border-accent/20">
                    {paragraphSpacing ?? 8}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={1}
                  value={paragraphSpacing ?? 8}
                  onChange={(e) => setParagraphSpacing(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 0, label: 'Compact', desc: '0px' },
                    { val: 8, label: 'Standard', desc: '8px' },
                    { val: 16, label: 'Relaxed', desc: '16px' },
                    { val: 24, label: 'Double', desc: '24px' },
                  ].map((ps) => (
                    <button
                      key={ps.val}
                      type="button"
                      onClick={() => setParagraphSpacing(ps.val)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        (paragraphSpacing ?? 8) === ps.val
                          ? 'border-accent bg-accent/10 text-accent font-semibold ring-1 ring-accent'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                      }`}
                      style={{
                        borderColor: (paragraphSpacing ?? 8) === ps.val ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="text-xs font-semibold">{ps.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{ps.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paragraph Indent Slider & Presets */}
              <div className="space-y-3 p-4 rounded-2xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs">Paragraph First-Line Indent</h3>
                    <p className="text-[11px] opacity-60">Indentation offset for the first line of each paragraph.</p>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold border border-accent/20">
                    {paragraphIndent ?? 0}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={2}
                  value={paragraphIndent ?? 0}
                  onChange={(e) => setParagraphIndent(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 0, label: 'None (Flush)', desc: '0px' },
                    { val: 16, label: 'Light', desc: '16px' },
                    { val: 24, label: 'Classic Book', desc: '24px' },
                    { val: 32, label: 'Deep Indent', desc: '32px' },
                  ].map((pi) => (
                    <button
                      key={pi.val}
                      type="button"
                      onClick={() => setParagraphIndent(pi.val)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        (paragraphIndent ?? 0) === pi.val
                          ? 'border-accent bg-accent/10 text-accent font-semibold ring-1 ring-accent'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                      }`}
                      style={{
                        borderColor: (paragraphIndent ?? 0) === pi.val ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="text-xs font-semibold">{pi.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{pi.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Interactive Typography Preview Box */}
              <div className="space-y-2 p-4 rounded-2xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs">Live Typography Preview</h3>
                  <span className="text-[10px] opacity-50 uppercase tracking-wider font-mono">Interactive Sample</span>
                </div>
                <div
                  className="p-4 rounded-xl border transition-all select-none shadow-xs"
                  style={{
                    backgroundColor: 'var(--bg-editor)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--text-editor)',
                    fontFamily:
                      fontFamily === 'clarika'
                        ? '"Clarika", "Outfit", "Plus Jakarta Sans", sans-serif'
                        : fontFamily === 'bear-sans'
                        ? '"Plus Jakarta Sans", "Bear Sans UI", sans-serif'
                        : fontFamily === 'serif'
                        ? '"Newsreader", Georgia, serif'
                        : fontFamily === 'mono'
                        ? '"JetBrains Mono", monospace'
                        : fontFamily === 'system'
                        ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                        : 'Inter, sans-serif',
                    fontSize: `${fontSize}px`,
                    lineHeight: numericLineHeight,
                  }}
                >
                  <p
                    style={{
                      marginTop: `${(paragraphSpacing ?? 8) / 2}px`,
                      marginBottom: `${(paragraphSpacing ?? 8) / 2}px`,
                      textIndent: `${paragraphIndent ?? 0}px`,
                    }}
                  >
                    The quick brown fox jumps over the lazy dog. AmNote provides an elegant, distraction-free markdown canvas crafted for writers and thinkers.
                  </p>
                  <p
                    style={{
                      marginTop: `${(paragraphSpacing ?? 8) / 2}px`,
                      marginBottom: `${(paragraphSpacing ?? 8) / 2}px`,
                      textIndent: `${paragraphIndent ?? 0}px`,
                    }}
                  >
                    Adjust font size, line height, canvas line width, paragraph spacing, and first-line indents to create your perfect custom writing environment.
                  </p>
                </div>
              </div>

              {/* Typewriter Mode & Word Goals */}
              <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                {/* Typewriter Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs">Typewriter Scrolling Mode</h3>
                    <p className="text-[11px] opacity-60">Keeps the active typing line centered vertically in the viewport (Ctrl+Shift+T).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTypewriterMode(!typewriterMode)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      typewriterMode ? 'bg-accent' : 'bg-black/20 dark:bg-white/20'
                    }`}
                    style={{
                      backgroundColor: typewriterMode ? 'var(--color-accent)' : undefined,
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        typewriterMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Word Count Target Goal */}
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-xs">Writing Word Goal</h3>
                    <p className="text-[11px] opacity-60">Set a session word count target with progress tracker in the status bar.</p>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[0, 100, 250, 500, 1000, 2000].map((goal) => (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => setWordGoal(goal)}
                        className={`p-2 rounded-xl border text-center transition-all text-xs font-semibold ${
                          wordGoal === goal
                            ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                        }`}
                        style={{
                          borderColor: wordGoal === goal ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      >
                        {goal === 0 ? 'Off' : `${goal}w`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Text Highlight Color */}
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                  <div>
                    <h3 className="font-semibold text-xs">Default Text Highlight Color</h3>
                    <p className="text-[11px] opacity-60">Preferred background color for ==highlighted text== and bubble toolbar.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { name: 'Yellow', color: '#fef08a' },
                      { name: 'Mint Green', color: '#bbf7d0' },
                      { name: 'Sky Blue', color: '#bfdbfe' },
                      { name: 'Lavender', color: '#e9d5ff' },
                      { name: 'Rose Coral', color: '#fecaca' },
                      { name: 'Warm Amber', color: '#fed7aa' },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setDefaultHighlightColor(preset.color)}
                        title={preset.name}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          defaultHighlightColor.toLowerCase() === preset.color.toLowerCase()
                            ? 'border-accent bg-accent/10 text-accent font-semibold ring-1 ring-accent'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                        }`}
                        style={{
                          borderColor: defaultHighlightColor.toLowerCase() === preset.color.toLowerCase() ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 shadow-xs"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    ))}

                    {/* Custom Hex Color Picker */}
                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all" style={{ borderColor: 'var(--color-border)' }}>
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/20 shadow-xs"
                        style={{ backgroundColor: defaultHighlightColor }}
                      />
                      <span>Custom: <span className="font-mono">{defaultHighlightColor}</span></span>
                      <input
                        type="color"
                        value={defaultHighlightColor}
                        onChange={(e) => setDefaultHighlightColor(e.target.value)}
                        className="w-0 h-0 opacity-0 absolute"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THEMES TAB */}
          {activeTab === 'themes' && (
            <div className="space-y-6">
              <div>
                {/* Header & Main Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-xs">Color Theme Gallery</h3>
                    <p className="text-[11px] opacity-60">24 Curated Presets. Click any theme to apply.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('omarchy-sync')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <Laptop size={13} />
                      <span>Sync OS</span>
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 mb-4 p-1 rounded-xl border bg-black/5 dark:bg-white/5 w-fit" style={{ borderColor: 'var(--color-border)' }}>
                  {(['all', 'dark', 'light'] as const).map((filter) => {
                    const isSelected = themeFilter === filter;
                    const allThemesList = Object.values(THEMES);
                    const count = allThemesList.filter((t) => {
                      if (filter === 'all') return true;
                      if (filter === 'dark') return t.isDark;
                      if (filter === 'light') return !t.isDark;
                      return true;
                    }).length;

                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setThemeFilter(filter)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                          isSelected
                            ? 'bg-accent text-white shadow-xs'
                            : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                        style={{ backgroundColor: isSelected ? 'var(--color-accent)' : undefined }}
                      >
                        {filter} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Theme Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.values(THEMES)
                    .filter((theme) => {
                      if (themeFilter === 'dark') return theme.isDark;
                      if (themeFilter === 'light') return !theme.isDark;
                      return true;
                    })
                    .map((theme) => {
                      const isSelected = themeId === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setTheme(theme.id)}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group select-none ${
                            isSelected
                              ? 'ring-2 ring-accent shadow-md'
                              : 'hover:border-border/80 opacity-85 hover:opacity-100 hover:scale-[1.01]'
                          }`}
                          style={{
                            backgroundColor: theme.noteListCardBg,
                            borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                          }}
                        >
                          <div className="w-full">
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-2.5">
                              <span
                                className="font-bold text-xs truncate"
                                style={{ color: theme.editorText }}
                              >
                                {theme.name}
                              </span>
                              {isSelected && (
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                                  style={{ backgroundColor: theme.accent }}
                                >
                                  <Check size={10} />
                                </div>
                              )}
                            </div>

                            {/* Theme color swatch preview */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <div
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: theme.accent }}
                                title="Accent"
                              />
                              <div
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: theme.editorBg }}
                                title="Editor Background"
                              />
                              <div
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: theme.sidebarBg }}
                                title="Sidebar Background"
                              />
                              <div
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                                style={{ backgroundColor: theme.tagBg }}
                                title="Tag Background"
                              />
                              <span className="text-[10px] opacity-40 ml-auto uppercase font-mono">
                                {theme.isDark ? 'Dark' : 'Light'}
                              </span>
                            </div>
                          </div>

                          <div className="w-full flex items-center justify-between pt-2.5 mt-2 border-t border-black/5 dark:border-white/5 text-[11px] opacity-50 font-medium">
                            <span>{isSelected ? 'Active' : 'Click to Apply'}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* DATA & VAULT TAB */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Vault Directory Card */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={16} className="text-accent" style={{ color: 'var(--color-accent)' }} />
                    <h3 className="font-bold text-xs">AmNote Native Vault</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold font-mono">
                    Markdown on Disk
                  </span>
                </div>

                <p className="text-xs opacity-70 leading-relaxed font-mono bg-black/10 dark:bg-white/5 p-2.5 rounded-xl break-all">
                  {vaultPath}
                </p>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handlePickVault}
                      disabled={isChangingVault}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold hover:bg-accent/10 hover:text-accent hover:border-accent transition-all disabled:opacity-50"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <FolderInput size={14} />
                      <span>{isChangingVault ? 'Changing Vault...' : 'Change Vault Folder...'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={openVaultInFileManager}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <FolderOpen size={14} />
                      <span>Open in File Manager</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleReloadFromDisk}
                      disabled={isReloading || isChangingVault}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <RefreshCw size={13} className={isReloading ? 'animate-spin' : ''} />
                      <span>{isReloading ? 'Reloading...' : 'Rescan Disk'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetVault}
                      disabled={isChangingVault}
                      title="Reset back to default ~/Documents/AmNotes"
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-medium opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <RotateCcw size={13} />
                      <span>Reset to Default</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Local Vault Stats */}
              <div className="p-4 rounded-2xl border space-y-3" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="font-semibold text-xs">Vault Statistics</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="opacity-60">Total Notes:</span>
                    <span className="font-bold ml-2">{notes.length}</span>
                  </div>
                  <div>
                    <span className="opacity-60">Active Tags:</span>
                    <span className="font-bold ml-2">
                      {new Set(notes.flatMap((n) => n.tags)).size}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-60">File Format:</span>
                    <span className="font-bold ml-2 font-mono">.md (YAML Frontmatter)</span>
                  </div>
                  <div>
                    <span className="opacity-60">Target Platforms:</span>
                    <span className="font-bold ml-2 text-emerald-400">Linux & macOS</span>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleExportAllMarkdown}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <Download size={14} />
                  <span>Download Backup Archive (.MD)</span>
                </button>
              </div>

              {/* About AmNote */}
              <div className="pt-4 pb-2 flex flex-col items-center justify-center text-center space-y-2">
                <AmNoteLogo size={52} variant="dark-circle" />
                <div className="space-y-0.5">
                  <div className="font-extrabold text-sm tracking-tight">AmNote</div>
                  <div className="text-xs opacity-60 font-medium">Ideas, Thoughts, Noted</div>
                </div>
                <div className="flex items-center justify-center gap-1 text-[11px] opacity-40 pt-1">
                  <span>v1.0.0 — Crafted with</span>
                  <Heart size={11} className="text-rose-500 fill-current" />
                  <span>by Ade Mahmud • Linux & macOS</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
