import { useRef, useState } from 'react';

export interface Point {
  top: number;
  left: number;
}

export function useEditorMenuState() {
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState<Point>({ top: 0, left: 0 });
  const [isWikiMenuOpen, setIsWikiMenuOpen] = useState(false);
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiPosition, setWikiPosition] = useState<Point>({ top: 0, left: 0 });
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<Point>({ top: 0, left: 0 });

  const isSlashOpenRef = useRef(isSlashOpen);
  isSlashOpenRef.current = isSlashOpen;
  const isWikiMenuOpenRef = useRef(isWikiMenuOpen);
  isWikiMenuOpenRef.current = isWikiMenuOpen;

  return {
    isSlashOpen,
    setIsSlashOpen,
    slashQuery,
    setSlashQuery,
    menuPosition,
    setMenuPosition,
    isWikiMenuOpen,
    setIsWikiMenuOpen,
    wikiQuery,
    setWikiQuery,
    wikiPosition,
    setWikiPosition,
    showBubbleMenu,
    setShowBubbleMenu,
    bubblePosition,
    setBubblePosition,
    isSlashOpenRef,
    isWikiMenuOpenRef,
  };
}
