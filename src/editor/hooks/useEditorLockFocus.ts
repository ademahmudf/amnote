import { useEffect, useRef, useState } from 'react';
import type { Note } from '../../types/note';

export function useEditorLockFocus(activeNote?: Note, isUnlocked = true) {
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeNote?.isLocked && !isUnlocked) {
      setUnlockPassword('');
      setUnlockError(false);
      const timer = window.setTimeout(() => passwordInputRef.current?.focus(), 50);
      return () => window.clearTimeout(timer);
    }
  }, [activeNote?.id, activeNote?.isLocked, isUnlocked]);

  return {
    unlockPassword,
    setUnlockPassword,
    unlockError,
    setUnlockError,
    passwordInputRef,
  };
}
