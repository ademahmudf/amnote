import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { vaultAdapter } from '../../db/vaultAdapter';
import { useNoteStore } from '../../store/useNoteStore';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function insertImageNode(
  view: NonNullable<Editor['view']>,
  src: string,
  alt: string,
  coordinates?: { left: number; top: number }
): void {
  const { schema } = view.state;
  const node = schema.nodes.image.create({ src, alt });
  const transaction = coordinates
    ? (() => {
        const position = view.posAtCoords(coordinates);
        return position
          ? view.state.tr.insert(position.pos, node)
          : view.state.tr.replaceSelectionWith(node);
      })()
    : view.state.tr.replaceSelectionWith(node);
  view.dispatch(transaction);
}

interface UseImageAttachmentsOptions {
  editorRef: React.MutableRefObject<Editor | null>;
}

export function useImageAttachments({ editorRef }: UseImageAttachmentsOptions) {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [copiedImage, setCopiedImage] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAndInsert = useCallback(async (file: File, view?: Editor['view'], coordinates?: { left: number; top: number }) => {
    if (!file.type.startsWith('image/')) return false;
    const noteId = useNoteStore.getState().activeNoteId;
    if (!noteId) return false;

    setAttachmentError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      let src = dataUrl;
      try {
        src = await vaultAdapter.saveAttachment(noteId, file.name, dataUrl);
      } catch (error) {
        console.error('Falling back to an inline image because attachment storage failed:', error);
        setAttachmentError(error instanceof Error ? error.message : 'Attachment storage failed; image was embedded instead.');
      }

      if (view) {
        insertImageNode(view, src, file.name || 'Image', coordinates);
      } else if (editorRef.current && !editorRef.current.isDestroyed) {
        editorRef.current.chain().focus().setImage({ src, alt: file.name || 'Image' }).run();
      }
      return true;
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Unable to import image.');
      return false;
    }
  }, [editorRef]);

  const insertImageFromFile = useCallback((file: File) => {
    void uploadAndInsert(file);
  }, [uploadAndInsert]);

  useEffect(() => {
    const handleTrigger = () => fileInputRef.current?.click();
    const handleOpenLightbox = (event: Event) => {
      const customEvent = event as CustomEvent<{ src: string; alt: string }>;
      if (customEvent.detail) {
        setLightboxImage(customEvent.detail);
        setLightboxZoom(1);
      }
    };

    window.addEventListener('amnote:trigger-image-upload', handleTrigger);
    window.addEventListener('amnote:open-lightbox', handleOpenLightbox);
    return () => {
      window.removeEventListener('amnote:trigger-image-upload', handleTrigger);
      window.removeEventListener('amnote:open-lightbox', handleOpenLightbox);
    };
  }, []);

  return {
    lightboxImage,
    setLightboxImage,
    lightboxZoom,
    setLightboxZoom,
    copiedImage,
    setCopiedImage,
    attachmentError,
    setAttachmentError,
    fileInputRef,
    uploadAndInsert,
    insertImageFromFile,
  };
}
