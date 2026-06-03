/**
 * Paste/drop and programmatic image insert for the note TipTap editor (Drive-backed URLs).
 */

import { useCallback, useRef, type RefObject } from 'react'
import type { Editor } from '@tiptap/react'
import type {
  CustomImageAttributes,
  CustomImageUploadHandler
} from '@/components/tiptap-extensions/tiptap-custom-image'
import { toast } from 'sonner'
import {
  uploadNoteDriveImage,
  validateNoteImageFile,
  type UploadNoteDriveImageOptions
} from '../services/noteDriveImageUpload'
import { buildNoteInsertedImageAttrs } from '../utils/noteInsertedImageLayout'

export interface UseNoteEditorImageUploadOptions {
  editorRef: RefObject<Editor | null>
  accessToken: string
  /** When false, paste/drop and file picker no-op */
  canInsertImages: boolean
  driveUploadOptionsRef: RefObject<UploadNoteDriveImageOptions>
  translate: (key: string) => string
}

async function buildInsertAttrs(
  editor: Editor,
  file: File,
  url: string,
  insertPos: number
): Promise<CustomImageAttributes> {
  try {
    return await buildNoteInsertedImageAttrs({ src: url, file, editor, insertPos })
  } catch {
    return { src: url }
  }
}

export function useNoteEditorImageUpload({
  editorRef,
  accessToken,
  canInsertImages,
  driveUploadOptionsRef,
  translate
}: UseNoteEditorImageUploadOptions): {
  uploadImage: CustomImageUploadHandler
  handlePaste: (view: unknown, event: ClipboardEvent) => boolean
  handleDrop: (
    view: { posAtCoords: (coords: { left: number; top: number }) => { pos: number } | null },
    event: DragEvent,
    _slice: unknown,
    moved: boolean
  ) => boolean
  insertImagesFromFileList: (files: FileList | File[]) => void
} {
  const accessTokenRef = useRef(accessToken)
  accessTokenRef.current = accessToken

  const translateRef = useRef(translate)
  translateRef.current = translate

  const uploadImage = useCallback<CustomImageUploadHandler>(
    async file => {
      const token = accessTokenRef.current
      if (!token) {
        throw new Error('note-image-upload-no-token')
      }
      const v = validateNoteImageFile(file)
      if (!v.ok) {
        throw new Error(v.errorKey)
      }
      const { url } = await uploadNoteDriveImage(file, token, driveUploadOptionsRef.current)
      return { url }
    },
    [driveUploadOptionsRef]
  )

  const showUploadError = useCallback((err: unknown) => {
    const tr = translateRef.current
    const key = err instanceof Error ? err.message : ''
    if (key === 'note-image-unsupported-type') {
      toast.error(tr('note-image-unsupported-type'))
      return
    }
    if (key === 'note-image-too-large') {
      toast.error(tr('note-image-too-large'))
      return
    }
    if (key === 'note-image-upload-no-token') {
      toast.error(tr('note-image-upload-no-token'))
      return
    }
    toast.error(tr('note-image-upload-failed'))
  }, [])

  const insertImage = useCallback(
    async (file: File, url: string, insertPos?: number) => {
      const ed = editorRef.current
      if (!ed) return

      const pos = insertPos ?? ed.state.selection.from
      const attrs = await buildInsertAttrs(ed, file, url, pos)

      if (insertPos != null) {
        ed.chain().focus().insertContentAt(insertPos, { type: 'image', attrs }).run()
        return
      }

      ed.chain().focus().setImage(attrs).run()
    },
    [editorRef]
  )

  const handlePaste = useCallback(
    (_view: unknown, event: ClipboardEvent) => {
      if (!canInsertImages) return false
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of items) {
        if (item.type.includes('image')) {
          const file = item.getAsFile()
          if (file) {
            event.preventDefault()
            void uploadImage(file)
              .then(({ url }) => insertImage(file, url))
              .catch(err => {
                showUploadError(err)
              })
            return true
          }
        }
      }
      return false
    },
    [canInsertImages, insertImage, showUploadError, uploadImage]
  )

  const handleDrop = useCallback(
    (
      view: { posAtCoords: (coords: { left: number; top: number }) => { pos: number } | null },
      event: DragEvent,
      _slice: unknown,
      moved: boolean
    ) => {
      if (!canInsertImages) return false
      if (moved) return false
      const files = event.dataTransfer?.files
      const imageFiles = files ? Array.from(files).filter(f => f.type.startsWith('image/')) : []
      if (imageFiles.length === 0) return false
      event.preventDefault()
      const coords = view.posAtCoords?.({ left: event.clientX, top: event.clientY })
      const dropPos = coords?.pos ?? null

      void Promise.all(imageFiles.map(f => uploadImage(f)))
        .then(async results => {
          const ed = editorRef.current
          if (!ed || results.length === 0) return

          for (let i = 0; i < results.length; i += 1) {
            const { url } = results[i]!
            const file = imageFiles[i]!
            await insertImage(file, url, i === 0 && dropPos != null ? dropPos : undefined)
          }
        })
        .catch(err => {
          showUploadError(err)
        })
      return true
    },
    [canInsertImages, editorRef, insertImage, showUploadError, uploadImage]
  )

  const insertImagesFromFileList = useCallback(
    (files: FileList | File[]) => {
      if (!canInsertImages) return
      const list = Array.from(files).filter(f => f.type.startsWith('image/'))
      if (list.length === 0) return
      void Promise.all(list.map(f => uploadImage(f)))
        .then(async results => {
          for (let i = 0; i < results.length; i += 1) {
            const { url } = results[i]!
            await insertImage(list[i]!, url)
          }
        })
        .catch(err => {
          showUploadError(err)
        })
    },
    [canInsertImages, insertImage, showUploadError, uploadImage]
  )

  return { uploadImage, handlePaste, handleDrop, insertImagesFromFileList }
}
