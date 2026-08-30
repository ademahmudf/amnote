import React from 'react';
import { X, FileText, Code, Printer, Download } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';

export const ExportModal: React.FC = () => {
  const isExportModalOpen = useNoteStore((state) => state.isExportModalOpen);
  const setExportModalOpen = useNoteStore((state) => state.setExportModalOpen);
  const activeNote = useNoteStore((state) => state.getActiveNote());

  if (!isExportModalOpen || !activeNote) return null;

  const handleExportMarkdown = () => {
    const blob = new Blob([activeNote.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-z0-9_-]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  const handleExportText = () => {
    const plain = activeNote.content.replace(/[#*`_~[\]()]/g, '');
    const blob = new Blob([plain], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-z0-9_-]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  const handleExportHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${activeNote.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 8px; }
    h2 { font-size: 1.5em; margin-top: 24px; }
    pre { background: #f4f5f7; padding: 12px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #e53935; margin: 0; padding-left: 16px; color: #666; }
    .tag { background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
  </style>
</head>
<body>
  <h1>${activeNote.title}</h1>
  <pre>${activeNote.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/[^a-z0-9_-]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  const handlePrint = () => {
    setExportModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={() => setExportModalOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-notelist)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2">
            <Download size={16} className="text-accent" style={{ color: 'var(--color-accent)' }} />
            <h3 className="font-bold text-xs">Export Note</h3>
          </div>
          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                }}
              >
                MD
              </div>
              <div>
                <div className="text-xs font-semibold group-hover:text-accent transition-colors">
                  Markdown (.md)
                </div>
                <div className="text-[11px] opacity-60">Standard Markdown with tags and links</div>
              </div>
            </div>
            <Download size={14} className="opacity-40 group-hover:opacity-100" />
          </button>

          <button
            type="button"
            onClick={handleExportHtml}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                }}
              >
                <Code size={14} />
              </div>
              <div>
                <div className="text-xs font-semibold group-hover:text-accent transition-colors">
                  Web Page (.html)
                </div>
                <div className="text-[11px] opacity-60">Clean HTML styled document</div>
              </div>
            </div>
            <Download size={14} className="opacity-40 group-hover:opacity-100" />
          </button>

          <button
            type="button"
            onClick={handleExportText}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                }}
              >
                <FileText size={14} />
              </div>
              <div>
                <div className="text-xs font-semibold group-hover:text-accent transition-colors">
                  Plain Text (.txt)
                </div>
                <div className="text-[11px] opacity-60">Raw unformatted text file</div>
              </div>
            </div>
            <Download size={14} className="opacity-40 group-hover:opacity-100" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                style={{
                  backgroundColor: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                }}
              >
                <Printer size={14} />
              </div>
              <div>
                <div className="text-xs font-semibold group-hover:text-accent transition-colors">
                  Print / Save as PDF
                </div>
                <div className="text-[11px] opacity-60">Browser print & PDF dialog</div>
              </div>
            </div>
            <Download size={14} className="opacity-40 group-hover:opacity-100" />
          </button>
        </div>
      </div>
    </div>
  );
};
