export function newNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function extractTitleFromContent(content: string): string {
  for (const rawLine of content.trim().split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const titleMatch = line.match(/^#+\s*(.*)$/);
    if (titleMatch && titleMatch[1].trim()) return titleMatch[1].trim();
    return line;
  }
  return 'Untitled Note';
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  try {
    const message = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', message);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return btoa(password);
  }
}

export function persistenceMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

export function isSaveConflict(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('CONFLICT:');
}
