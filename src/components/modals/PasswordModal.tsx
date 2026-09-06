import React, { useState, useEffect, useRef } from 'react';
import { useNoteStore } from '../../store/useNoteStore';
import { useUIStore } from '../../store/useUIStore';
import { Lock, KeyRound, X, Check, ShieldAlert } from 'lucide-react';

export const PasswordModal: React.FC = () => {
  const isPasswordModalOpen = useUIStore((state) => state.isPasswordModalOpen);
  const passwordModalNoteId = useUIStore((state) => state.passwordModalNoteId);
  const setPasswordModalOpen = useUIStore((state) => state.setPasswordModalOpen);
  const lockNote = useNoteStore((state) => state.lockNote);
  const removeLock = useNoteStore((state) => state.removeLock);
  const notes = useNoteStore((state) => state.notes);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const targetNote = notes.find((n) => n.id === passwordModalNoteId);

  useEffect(() => {
    if (isPasswordModalOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isPasswordModalOpen]);

  if (!isPasswordModalOpen || !targetNote) return null;

  const handleSaveLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    await lockNote(targetNote.id, password || undefined);
    setPasswordModalOpen(false);
  };

  const handleRemoveLock = async () => {
    await removeLock(targetNote.id);
    setPasswordModalOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setPasswordModalOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden p-6 animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {targetNote.isLocked ? 'Manage Note Lock' : 'Lock Note'}
              </h3>
              <p className="text-xs opacity-60">
                {targetNote.title || 'Untitled Note'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPasswordModalOpen(false)}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveLock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-70 mb-1.5">
              Password (Optional)
            </label>
            <div className="relative">
              <KeyRound
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
              />
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Leave blank for simple session lock"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
          </div>

          {password && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-70 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Confirm password"
                className="w-full px-3 py-2 text-sm rounded-xl border bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <ShieldAlert size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="text-[11px] opacity-60 leading-relaxed bg-black/5 dark:bg-white/5 p-3 rounded-xl">
            🔒 Locked notes conceal snippet previews in the note list and require unlocking before viewing or editing. Notes stay readable as plaintext files on disk — locking is not encryption.
          </div>

          <div className="flex items-center justify-between pt-2">
            {targetNote.isLocked ? (
              <button
                type="button"
                onClick={handleRemoveLock}
                className="px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Remove Lock
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium opacity-70 hover:opacity-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Check size={14} />
                <span>{targetNote.isLocked ? 'Update Lock' : 'Lock Note'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
