export type FontFamily =
  | 'bear-sans'
  | 'clarika'
  | 'sans'
  | 'serif'
  | 'mono'
  | 'system'
  | 'instrument-serif'
  | 'cormorant'
  | 'eb-garamond'
  | 'jost'
  | 'montserrat'
  | 'space-grotesk'
  | 'ibm-plex-mono'
  | 'caveat';

export type FontCategory = 'All' | 'Sans' | 'Serif' | 'Monospace' | 'Handwritten' | 'System';

export interface FontOption {
  id: FontFamily;
  label: string;
  category: 'Sans' | 'Serif' | 'Monospace' | 'Handwritten' | 'System';
  desc: string;
  preview: string;
  fontFamily: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'clarika',
    label: 'Clarika',
    category: 'Sans',
    desc: 'Geometric & Humanist Grotesque',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Clarika", "Clarika Pro", "Outfit", "Plus Jakarta Sans", sans-serif',
  },
  {
    id: 'bear-sans',
    label: 'Bear Sans',
    category: 'Sans',
    desc: 'Bear 2 Signature Geometric',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Plus Jakarta Sans", "Bear Sans UI", -apple-system, sans-serif',
  },
  {
    id: 'sans',
    label: 'Inter Sans',
    category: 'Sans',
    desc: 'Clean & Technical Neo-Grotesque',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: 'jost',
    label: 'Jost',
    category: 'Sans',
    desc: 'Geometric Modernist & Bauhaus',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Jost", "Outfit", -apple-system, sans-serif',
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    category: 'Sans',
    desc: 'Urban Geometric & Contemporary',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Montserrat", "Plus Jakarta Sans", -apple-system, sans-serif',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    category: 'Sans',
    desc: 'Neo-Brutalist & Tech Proportional',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Space Grotesk", "Outfit", -apple-system, sans-serif',
  },
  {
    id: 'instrument-serif',
    label: 'Instrument Serif',
    category: 'Serif',
    desc: 'Contemporary Editorial & Modernist',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Instrument Serif", "Newsreader", Georgia, serif',
  },
  {
    id: 'cormorant',
    label: 'Cormorant Garamond',
    category: 'Serif',
    desc: 'Renaissance Classic & Poetic Book',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Cormorant Garamond", "Garamond", "Baskerville", serif',
  },
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    category: 'Serif',
    desc: 'Classical Renaissance & Old-Style',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"EB Garamond", "Cormorant Garamond", "Garamond", Georgia, serif',
  },
  {
    id: 'serif',
    label: 'Editorial Serif',
    category: 'Serif',
    desc: 'Warm Literary Book & Newsprint',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Newsreader", "Charter", Georgia, serif',
  },
  {
    id: 'mono',
    label: 'JetBrains Mono',
    category: 'Monospace',
    desc: 'Developer & Code Monospace',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  {
    id: 'ibm-plex-mono',
    label: 'IBM Plex Mono',
    category: 'Monospace',
    desc: 'Industrial Mid-Century Typewriter',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
  },
  {
    id: 'caveat',
    label: 'Caveat',
    category: 'Handwritten',
    desc: 'Organic Cursive Journal & Sketch',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '"Caveat", "Architects Daughter", cursive, sans-serif',
  },
  {
    id: 'system',
    label: 'System Native',
    category: 'System',
    desc: 'OS Native Platform Default',
    preview: 'The quick brown fox jumps over the lazy dog',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
];

export function getFontFamilyCss(id: FontFamily): string {
  const match = FONT_OPTIONS.find((f) => f.id === id);
  return match?.fontFamily ?? '"Plus Jakarta Sans", "Bear Sans UI", sans-serif';
}
