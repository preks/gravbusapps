/**
 * Paste and drop image handlers for PagedDocumentEditor.
 * Uploads images and inserts them at cursor or drop position.
 */

import { useCallback, type RefObject } from 'react'
import type { Editor } from '@tiptap/react'
import type { CustomImageUploadHandler, ImageUploadContext } from '@/components/tiptap-extensions/tiptap-custom-image'
import type { PageLayoutPaginationConfig } from '../../../utils/pageLayoutUtils'
import { buildInitialInsertedImageAttrs } from '../../../utils/initialInsertedImageLayout'

export interface UseEditorImageHandlersProps {
  editorRef: RefObject<Editor | null>
  uploadImage: CustomImageUploadHandler
  uploadContext?: ImageUploadContext
  paginationConfig: PageLayoutPaginationConfig | null
}

export function useEditorImageHandlers({
  editorRef,
  uploadImage,
  uploadContext,
  paginationConfig
}: UseEditorImageHandlersProps): {
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
            const insertPos = editorRef.current?.state.selection.from ?? null
            uploadImage(file, uploadContext)
              .then(async ({ url }) => {
                const ed = editorRef.current
                if (!ed) return
                const attrs = await buildInitialInsertedImageAttrs({
                  src: url,
                  file,
                  paginationConfig,
                  editor: ed,
                  insertPos: insertPos ?? ed.state.selection.from
                })
                ed.chain().focus().setImage(attrs).run()
              })
              .catch(() => {
                const reader = new FileReader()
                reader.onload = () => {
                  void (async () => {
                    const ed = editorRef.current
                    if (!ed) return
                    const src = reader.result as string
                    try {
                      const attrs = await buildInitialInsertedImageAttrs({
                        src,
                        file,
                        paginationConfig,
                        editor: ed,
                        insertPos: insertPos ?? ed.state.selection.from
                      })
                      ed.chain().focus().setImage(attrs).run()
                    } catch {
                      ed.chain().focus().setImage({ src }).run()
                    }
                  })()
                }
                reader.readAsDataURL(file)
              })
            return true
          }
        }
      }
      return false
    },
    [editorRef, paginationConfig, uploadContext, uploadImage]
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
      const dropPos = coords?.pos ?? null

      Promise.all(imageFiles.map(file => uploadImage(file, uploadContext)))
        .then(async results => {
          const urls = results.map(r => r.url)
          const ed = editorRef.current
          if (!ed || urls.length === 0) return

          if (dropPos == null) {
            for (let i = 0; i < urls.length; i += 1) {
              const url = urls[i]!
              const file = imageFiles[i]!
              const attrs = await buildInitialInsertedImageAttrs({
                src: url,
                file,
                paginationConfig,
                editor: ed,
                insertPos: ed.state.selection.from
              })
              ed.chain().focus().setImage(attrs).run()
            }
          } else {
            for (let i = 0; i < urls.length; i += 1) {
              const url = urls[i]!
              const file = imageFiles[i]!
              const attrs = await buildInitialInsertedImageAttrs({
                src: url,
                file,
                paginationConfig,
                editor: ed,
                insertPos: i === 0 ? dropPos : ed.state.selection.from
              })
              if (i === 0) {
                ed.chain().focus().insertContentAt(dropPos, { type: 'image', attrs }).run()
              } else {
                ed.chain().focus().setImage(attrs).run()
              }
            }
          }
        })
        .catch(() => {
          const file = imageFiles[0]
          const reader = new FileReader()
          reader.onload = () => {
            void (async () => {
              const ed = editorRef.current
              if (!ed || !file) return
              const src = reader.result as string
              try {
                const attrs = await buildInitialInsertedImageAttrs({
                  src,
                  file,
                  paginationConfig,
                  editor: ed,
                  insertPos: dropPos ?? ed.state.selection.from
                })
                if (dropPos != null) {
                  ed.chain().focus().insertContentAt(dropPos, { type: 'image', attrs }).run()
                } else {
                  ed.chain().focus().setImage(attrs).run()
                }
              } catch {
                if (dropPos != null) {
                  ed.chain().focus().insertContentAt(dropPos, { type: 'image', attrs: { src } }).run()
                } else {
                  ed.chain().focus().setImage({ src }).run()
                }
              }
            })()
          }
          reader.readAsDataURL(file)
        })
      return true
    },
    [editorRef, paginationConfig, uploadContext, uploadImage]
  )

  return { handlePaste, handleDrop }
}
