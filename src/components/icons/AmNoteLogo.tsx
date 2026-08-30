import React from 'react';

interface AmNoteLogoProps {
  size?: number | string;
  variant?: 'icon' | 'dark' | 'dark-circle' | 'card' | 'light' | 'light-circle';
  className?: string;
}

export const AmNoteLogo: React.FC<AmNoteLogoProps> = ({
  size = 28,
  variant = 'dark',
  className = '',
}) => {
  const src = variant === 'card' ? '/new-amnote.png' : '/new-amnote-dark.png';

  return (
    <img
      src={src}
      alt="AmNote"
      style={{ width: size, height: size }}
      className={`object-contain select-none shrink-0 ${className}`}
    />
  );
};
