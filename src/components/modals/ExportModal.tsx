import React, { useState } from 'react';
import {
  X,
  FileText,
  Code,
  FileDown,
  Download,
  Copy,
  Check,
  Share2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useNoteStore } from '../../store/useNoteStore';
import { useUIStore } from '../../store/useUIStore';
import { useThemeStore } from '../../store/useThemeStore';
import { markdownToHtml } from '../../editor/utils/markdownCodec';
import { notify } from '../../store/useNotificationStore';

export const ExportModal: React.FC = () => {
  const isExportModalOpen = useUIStore((state) => state.isExportModalOpen);
  const setExportModalOpen = useUIStore((state) => state.setExportModalOpen);
  const activeNote = useNoteStore((state) => state.getActiveNote());
  const { getThemeColors } = useThemeStore();
  const theme = getThemeColors();

  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isExportModalOpen || !activeNote) return null;

  const showToast = (action: string) => {
    setCopiedAction(action);
    setTimeout(() => {
      setCopiedAction(null);
    }, 2200);
  };

  const getCleanSlug = () => activeNote.title.replace(/[^a-z0-9_-]/gi, '_') || 'Untitled';

  const handleExportMarkdown = () => {
    const blob = new Blob([activeNote.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getCleanSlug()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('md');
    notify({
      title: 'AmNote Export',
      sender: 'Markdown',
      message: `Exported "${activeNote.title || 'Untitled'}" as .md`,
      type: 'success',
    });
  };

  const handleExportText = () => {
    const plain = activeNote.content.replace(/[#*`_~[\]()]/g, '');
    const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getCleanSlug()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('txt');
    notify({
      title: 'AmNote Export',
      sender: 'Plain Text',
      message: `Exported "${activeNote.title || 'Untitled'}" as .txt`,
      type: 'success',
    });
  };

  const generateFullHtmlDoc = () => {
    const bodyHtml = markdownToHtml(activeNote.content);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeNote.title || 'Untitled Note'}</title>
  <style>
    :root {
      --accent: ${theme.accent};
      --text: #1f2937;
      --bg: #ffffff;
      --border: #e5e7eb;
      --code-bg: #f3f4f6;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --text: #f3f4f6;
        --bg: #111827;
        --border: #374151;
        --code-bg: #1f2937;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.75;
      color: var(--text);
      background-color: var(--bg);
      max-width: 760px;
      margin: 48px auto;
      padding: 0 24px;
    }
    h1 { font-size: 2em; font-weight: 800; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin: 0 0 20px 0; color: var(--accent); line-height: 1.3; }
    h2 { font-size: 1.45em; font-weight: 700; margin: 30px 0 12px 0; line-height: 1.35; }
    h3 { font-size: 1.2em; font-weight: 600; margin: 24px 0 8px 0; line-height: 1.4; }
    p { margin: 0 0 14px 0; line-height: 1.75; }
    code { font-family: "JetBrains Mono", Menlo, Monaco, Consolas, monospace; background-color: var(--code-bg); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background-color: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; margin: 16px 0; overflow-x: auto; line-height: 1.55; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid var(--accent); margin: 18px 0; padding: 4px 0 4px 16px; opacity: 0.85; font-style: italic; line-height: 1.7; }
    mark { background-color: rgba(254, 240, 138, 0.5); padding: 2px 6px; border-radius: 4px; }
    ul, ol { padding-left: 24px; margin: 0 0 14px 0; }
    li { margin: 0 0 6px 0; line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13.5px; line-height: 1.6; }
    th, td { border: 1px solid var(--border); padding: 10px 14px; text-align: left; }
    th { background-color: var(--code-bg); font-weight: 600; }
    .am-callout-block { border-left: 4px solid var(--accent); background-color: var(--code-bg); padding: 14px 18px; border-radius: 8px; margin: 18px 0; line-height: 1.65; }
    .am-tag-pill { display: inline-block; background-color: var(--code-bg); color: var(--accent); border-radius: 12px; padding: 2px 10px; font-size: 12px; font-weight: 600; margin-right: 6px; }
    .meta-bar { font-size: 12px; opacity: 0.6; margin-bottom: 24px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="meta-bar">AmNote • ${new Date(activeNote.updatedAt).toLocaleDateString()}</div>
  <div class="content">${bodyHtml}</div>
</body>
</html>`;
  };

  const handleExportHtml = () => {
    const html = generateFullHtmlDoc();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getCleanSlug()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('html');
    notify({
      title: 'AmNote Export',
      sender: 'HTML Document',
      message: `Exported "${activeNote.title || 'Untitled'}" as .html`,
      type: 'success',
    });
  };

  const handleCopyRichText = async () => {
    const bodyHtml = markdownToHtml(activeNote.content);
    const plain = activeNote.content;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({
          'text/html': new Blob([bodyHtml], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      showToast('rich-copy');
      notify({
        title: 'AmNote Clipboard',
        sender: 'Rich Text',
        message: 'Formatted text copied to clipboard',
        type: 'success',
      });
    } catch {
      await navigator.clipboard.writeText(plain);
      showToast('rich-copy');
      notify({
        title: 'AmNote Clipboard',
        sender: 'Plain Text',
        message: 'Note copied to clipboard',
        type: 'info',
      });
    }
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const bodyHtml = markdownToHtml(activeNote.content);
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '680px';
      container.style.padding = '44px 48px';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#0f172a';
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      container.style.lineHeight = '1.75';
      container.style.fontSize = '14px';

      container.innerHTML = `
        <div style="font-size: 11px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, monospace; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; display: flex; justify-content: space-between;">
          <span>AmNote Document</span>
          <span>${new Date(activeNote.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>
        <style>
          * { box-sizing: border-box; }
          h1 { font-size: 24px; font-weight: 750; color: #0f172a; margin: 0 0 16px 0; padding-bottom: 10px; border-bottom: 1.5px solid #e2e8f0; line-height: 1.3; }
          h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 26px 0 12px 0; line-height: 1.35; }
          h3 { font-size: 15px; font-weight: 600; color: #334155; margin: 20px 0 8px 0; line-height: 1.4; }
          p { margin: 0 0 14px 0; line-height: 1.75; color: #1e293b; font-size: 14px; }
          ul, ol { margin: 0 0 14px 0; padding-left: 24px; color: #1e293b; }
          li { margin: 0 0 6px 0; line-height: 1.7; font-size: 14px; }
          code { font-family: "JetBrains Mono", Menlo, Monaco, Consolas, monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 12.5px; color: #0f172a; }
          pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 16px 0; overflow-x: auto; line-height: 1.55; }
          pre code { background: none; padding: 0; font-size: 12px; color: #334155; }
          blockquote { border-left: 3.5px solid #94a3b8; margin: 16px 0; padding: 4px 0 4px 16px; color: #475569; font-style: italic; line-height: 1.7; }
          mark { background-color: #fef08a; padding: 2px 4px; border-radius: 3px; }
          table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13.5px; line-height: 1.6; }
          th, td { border: 1px solid #e2e8f0; padding: 9px 12px; text-align: left; }
          th { background-color: #f8fafc; font-weight: 600; color: #0f172a; }
          .am-callout-block { border-left: 4px solid #6366f1; background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; margin: 16px 0; line-height: 1.65; font-size: 13.5px; }
          .am-task-list { list-style: none; padding-left: 2px; margin: 0 0 14px 0; }
          .am-task-item { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; line-height: 1.65; font-size: 14px; }
          .am-tag-pill { display: inline-block; background: #f1f5f9; color: #475569; border-radius: 12px; padding: 2px 8px; font-size: 11px; margin-right: 4px; font-weight: 500; }
        </style>
        <div>${bodyHtml}</div>
      `;

      document.body.appendChild(container);

      // Measure safe break boundaries across child elements
      const containerRect = container.getBoundingClientRect();
      const elements = Array.from(
        container.querySelectorAll('h1, h2, h3, p, li, pre, blockquote, tr, .am-callout-block, img, table')
      );
      const safeBreakOffsetsDom: number[] = [];
      elements.forEach((el) => {
        const r = el.getBoundingClientRect();
        const top = r.top - containerRect.top;
        const bottom = r.bottom - containerRect.top;
        if (top > 0) safeBreakOffsetsDom.push(top);
        if (bottom > 0) safeBreakOffsetsDom.push(bottom);
      });

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(container);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidthPt = pdf.internal.pageSize.getWidth();
      const pageHeightPt = pdf.internal.pageSize.getHeight();
      const marginPt = 36;
      const contentWidthPt = pageWidthPt - 2 * marginPt;
      const contentHeightPt = pageHeightPt - 2 * marginPt;

      // Scale factor from DOM coordinates to Canvas pixels
      const scaleDomToCanvas = canvas.height / containerRect.height;
      const safeBreakPixels = safeBreakOffsetsDom
        .map((domY) => domY * scaleDomToCanvas)
        .sort((a, b) => a - b);

      const maxPageCanvasHeight = (contentHeightPt / contentWidthPt) * canvas.width;

      let currentCanvasY = 0;
      let pageIndex = 0;

      while (currentCanvasY < canvas.height) {
        const remainingCanvasHeight = canvas.height - currentCanvasY;
        let sliceHeight = Math.min(remainingCanvasHeight, maxPageCanvasHeight);

        // If remaining content exceeds one page, snap slice to the nearest safe element boundary
        if (remainingCanvasHeight > maxPageCanvasHeight) {
          const targetY = currentCanvasY + maxPageCanvasHeight;
          const minAcceptableY = currentCanvasY + maxPageCanvasHeight * 0.65;
          const candidateBreaks = safeBreakPixels.filter(
            (bp) => bp <= targetY && bp >= minAcceptableY
          );

          if (candidateBreaks.length > 0) {
            const bestBreak = candidateBreaks[candidateBreaks.length - 1];
            sliceHeight = bestBreak - currentCanvasY;
          }
        }

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            currentCanvasY,
            canvas.width,
            sliceHeight,
            0,
            0,
            sliceCanvas.width,
            sliceHeight
          );
        }

        const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        const sliceHeightPt = (sliceHeight / canvas.width) * contentWidthPt;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          sliceImgData,
          'JPEG',
          marginPt,
          marginPt,
          contentWidthPt,
          sliceHeightPt,
          undefined,
          'FAST'
        );

        currentCanvasY += sliceHeight;
        pageIndex++;
      }

      pdf.save(`${getCleanSlug()}.pdf`);
      showToast('pdf');
      notify({
        title: 'AmNote Export',
        sender: 'PDF Document',
        message: `Exported "${activeNote.title || 'Untitled'}" as .pdf`,
        type: 'success',
      });
    } catch (err) {
      console.error('PDF export error:', err);
      notify({
        title: 'AmNote Export',
        sender: 'PDF Document',
        message: 'Failed to generate PDF export.',
        type: 'error',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={() => setExportModalOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-notelist)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-(--color-accent)" style={{ color: 'var(--color-accent)' }} />
            <div>
              <h3 className="font-bold text-xs">Export & Share Note</h3>
              <p className="text-[10px] opacity-60 truncate max-w-xs">{activeNote.title || 'Untitled'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Action List */}
        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {/* Export PDF Document (.pdf) */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group cursor-pointer"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              </div>
              <div>
                <div className="text-xs font-bold group-hover:text-(--color-accent) transition-colors flex items-center gap-1.5">
                  <span>Export PDF Document (.pdf)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-(--color-accent)/15 text-(--color-accent) font-semibold">Direct</span>
                </div>
                <div className="text-[11px] opacity-60">High-resolution multi-page PDF saved directly to ~/Downloads</div>
              </div>
            </div>
            {copiedAction === 'pdf' ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <Check size={13} /> Saved to Downloads
              </span>
            ) : isExportingPdf ? (
              <span className="text-[11px] text-(--color-accent) font-semibold">Generating...</span>
            ) : (
              <Download size={15} className="opacity-40 group-hover:opacity-100 shrink-0" />
            )}
          </button>

          {/* Copy Formatted Rich Text */}
          <button
            type="button"
            onClick={handleCopyRichText}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group cursor-pointer"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                style={{
                  backgroundColor: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold group-hover:text-(--color-accent) transition-colors">
                  Copy Formatted Rich Text
                </div>
                <div className="text-[11px] opacity-60">Paste into Google Docs, Mail, Slack, Notion with full formatting</div>
              </div>
            </div>
            {copiedAction === 'rich-copy' ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <Check size={13} /> Copied
              </span>
            ) : (
              <Copy size={15} className="opacity-40 group-hover:opacity-100 shrink-0" />
            )}
          </button>

          {/* Export Styled HTML */}
          <button
            type="button"
            onClick={handleExportHtml}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group cursor-pointer"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                style={{
                  backgroundColor: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                }}
              >
                <Code size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold group-hover:text-(--color-accent) transition-colors">
                  Web Page Document (.html)
                </div>
                <div className="text-[11px] opacity-60">Self-contained HTML file with embedded styling & tags</div>
              </div>
            </div>
            {copiedAction === 'html' ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <Check size={13} /> Saved
              </span>
            ) : (
              <Download size={15} className="opacity-40 group-hover:opacity-100 shrink-0" />
            )}
          </button>

          {/* Export Markdown */}
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group cursor-pointer"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-mono"
                style={{
                  backgroundColor: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                }}
              >
                MD
              </div>
              <div>
                <div className="text-xs font-semibold group-hover:text-(--color-accent) transition-colors">
                  Markdown File (.md)
                </div>
                <div className="text-[11px] opacity-60">Standard Markdown with YAML frontmatter tags and links</div>
              </div>
            </div>
            {copiedAction === 'md' ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <Check size={13} /> Saved
              </span>
            ) : (
              <Download size={15} className="opacity-40 group-hover:opacity-100 shrink-0" />
            )}
          </button>

          {/* Plain Text */}
          <button
            type="button"
            onClick={handleExportText}
            className="w-full flex items-center justify-between p-3 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left group cursor-pointer"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                style={{
                  backgroundColor: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                }}
              >
                <FileText size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold group-hover:text-(--color-accent) transition-colors">
                  Plain Text (.txt)
                </div>
                <div className="text-[11px] opacity-60">Unformatted clean text without markdown symbols</div>
              </div>
            </div>
            {copiedAction === 'txt' ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <Check size={13} /> Saved
              </span>
            ) : (
              <Download size={15} className="opacity-40 group-hover:opacity-100 shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
