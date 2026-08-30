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
  RefreshCw,
  Heart,
  LayoutGrid,
} from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useSettingsStore, type FontFamily, type EditorWidth, type UiScale } from '../../store/useSettingsStore';
import { THEMES } from '../../themes/themeDefinitions';
import type { ThemeId } from '../../types/note';

export const SettingsModal: React.FC = () => {
  const isSettingsOpen = useNoteStore((state) => state.isSettingsOpen);
  const setSettingsOpen = useNoteStore((state) => state.setSettingsOpen);
  const notes = useNoteStore((state) => state.notes);
  const vaultPath = useNoteStore((state) => state.vaultPath);
  const openVaultInFileManager = useNoteStore((state) => state.openVaultInFileManager);
  const reloadFromDisk = useNoteStore((state) => state.reloadFromDisk);

  const { themeId, setTheme } = useThemeStore();
  const {
    fontFamily,
    fontSize,
    editorWidth,
    uiScale,
    previewLines,
    typewriterMode,
    wordGoal,
    setFontFamily,
    setFontSize,
    setEditorWidth,
    setUiScale,
    setPreviewLines,
    setTypewriterMode,
    setWordGoal,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'themes' | 'typography' | 'data'>('typography');
  const [isReloading, setIsReloading] = useState(false);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-accent" style={{ color: 'var(--color-accent)' }} />
            <h2 className="font-bold text-sm">AmNote Preferences</h2>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
          >
            <X size={16} />
          </button>
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

              {/* Font Size Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs">Editor Text Size</h3>
                    <p className="text-[11px] opacity-60">Adjust editor writing font scale.</p>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                    {fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={13}
                  max={24}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>

              {/* Canvas Width */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-xs">Canvas Width</h3>
                  <p className="text-[11px] opacity-60">Maximum writing container width.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {widthOptions.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setEditorWidth(w.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        editorWidth === w.id
                          ? 'border-accent bg-accent/10 text-accent font-semibold'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                      }`}
                      style={{
                        borderColor: editorWidth === w.id ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                    >
                      <div className="text-xs">{w.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{w.desc.split(' ')[0]}</div>
                    </button>
                  ))}
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
              </div>
            </div>
          )}

          {/* THEMES TAB */}
          {activeTab === 'themes' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-xs">Color Theme</h3>
                    <p className="text-[11px] opacity-60">Select an editor and UI palette.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTheme('omarchy-sync')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Laptop size={13} />
                    <span>Sync with Omarchy OS</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.values(THEMES).map((theme) => {
                    const isSelected = themeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setTheme(theme.id as ThemeId)}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                          isSelected
                            ? 'ring-2 ring-accent shadow-lg'
                            : 'hover:border-border/80 opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: theme.noteListCardBg,
                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="font-bold text-xs"
                            style={{ color: theme.editorText }}
                          >
                            {theme.name}
                          </span>
                          {isSelected && (
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: theme.accent }}
                            >
                              <Check size={10} />
                            </div>
                          )}
                        </div>

                        {/* Theme color swatch preview */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <div
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: theme.accent }}
                          />
                          <div
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: theme.editorBg }}
                          />
                          <div
                            className="w-3 h-3 rounded-full border border-black/20"
                            style={{ backgroundColor: theme.sidebarBg }}
                          />
                          <span className="text-[10px] opacity-40 ml-auto uppercase font-mono">
                            {theme.isDark ? 'Dark' : 'Light'}
                          </span>
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

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={openVaultInFileManager}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <FolderOpen size={14} />
                    <span>Open in File Manager</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReloadFromDisk}
                    disabled={isReloading}
                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
                    <span>{isReloading ? 'Reloading...' : 'Rescan Disk'}</span>
                  </button>
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
              <div className="pt-2 text-center text-xs opacity-50 space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <span>AmNote v1.0.0 — Crafted with</span>
                  <Heart size={12} className="text-rose-500 fill-current" />
                  <span>by Ade Mahmud</span>
                </div>
                <div>Designed for Omarchy Linux & macOS</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
