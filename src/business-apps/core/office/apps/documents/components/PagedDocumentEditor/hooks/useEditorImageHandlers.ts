/**
 * Paste and drop image handlers for PagedDocumentEditor.
 * Uploads images and inserts them at cursor or drop position.
 */

import { useCallback, type RefObject } from 'react'
import type { Editor } from '@tiptap/react'
import type { CustomImageUploadHandler, ImageUploadContext } from '@/components/tiptap-extensions/tiptap-custom-image'

export interface UseEditorImageHandlersProps {
  editorRef: RefObject<Editor | null>
  uploadImage: CustomImageUploadHandler
  uploadContext?: ImageUploadContext
}

export function useEditorImageHandlers({ editorRef, uploadImage, uploadContext }: UseEditorImageHandlersProps): {
  handlePaste: (view: unknown, event: ClipboardEvent) => boolean
  handleDrop: (view: unknown, event: DragEvent, slice: unknown, moved: boolean) => boolean
} {
  const handlePaste = useCallback(
    (_view: unknown, event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of items) {
        if (item.type.includes('image')) {
          const file = item.getAsFile()
          if (file) {
            event.preventDefault()
            uploadImage(file, uploadContext)
              .then(({ url }) => {
                editorRef.current?.chain().focus().setImage({ src: url }).run()
              })
              .catch(() => {
                // Fallback: insert as data URL so user still gets the image
                const reader = new FileReader()
                reader.onload = () => {
                  editorRef.current
                    ?.chain()
                    .focus()
                    .setImage({ src: reader.result as string })
                    .run()
                }
                reader.readAsDataURL(file)
              })
            return true
          }
        }
      }
      return false
    },
    [editorRef, uploadContext, uploadImage]
  )

  const handleDrop = useCallback(
    (
      view: { posAtCoords: (coords: { left: number; top: number }) => { pos: number } | null },
      event: DragEvent,
      _slice: unknown,
      moved: boolean
    ) => {
      if (moved) return false
      const files = event.dataTransfer?.files
      const imageFiles = files ? Array.from(files).filter(f => f.type.startsWith('image/')) : []
      if (imageFiles.length === 0) return false
      event.preventDefault()
      const coords = view.posAtCoords?.({ left: event.clientX, top: event.clientY })
      const dropPos = coords?.pos

      Promise.all(imageFiles.map(file => uploadImage(file, uploadContext)))
        .then(results => {
          const urls = results.map(r => r.url)
          const ed = editorRef.current
          if (!ed || urls.length === 0) return
          if (dropPos == null) {
            urls.forEach(url => ed.chain().focus().setImage({ src: url }).run())
          } else {
            ed.chain()
              .focus()
              .insertContentAt(dropPos, { type: 'image', attrs: { src: urls[0] } })
              .run()
            for (let i = 1; i < urls.length; i++) {
              ed.chain().focus().setImage({ src: urls[i] }).run()
            }
          }
        })
        .catch(() => {
          // On upload failure, still try data URLs for first file so user gets something
          const file = imageFiles[0]
          const reader = new FileReader()
          reader.onload = () => {
            editorRef.current
              ?.chain()
              .focus()
              .setImage({ src: reader.result as string })
              .run()
          }
          reader.readAsDataURL(file)
        })
      return true
    },
    [editorRef, uploadContext, uploadImage]
  )

  return { handlePaste, handleDrop }
}
