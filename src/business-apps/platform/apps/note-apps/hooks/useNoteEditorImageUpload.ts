/**
 * Paste/drop and programmatic image insert for the note TipTap editor (Drive-backed URLs).
 */

import { useCallback, useRef, type RefObject } from 'react'
import type { Editor } from '@tiptap/react'
import type { CustomImageUploadHandler } from '@/components/tiptap-extensions/tiptap-custom-image'
import { toast } from 'sonner'
import {
  uploadNoteDriveImage,
  validateNoteImageFile,
  type UploadNoteDriveImageOptions
} from '../services/noteDriveImageUpload'

export interface UseNoteEditorImageUploadOptions {
  editorRef: RefObject<Editor | null>
  accessToken: string
  /** When false, paste/drop and file picker no-op */
  canInsertImages: boolean
  driveUploadOptionsRef: RefObject<UploadNoteDriveImageOptions>
  translate: (key: string) => string
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

  const insertAtCursor = useCallback(
    (url: string) => {
      const ed = editorRef.current
      if (!ed) return
      ed.chain().focus().setImage({ src: url }).run()
    },
    [editorRef]
  )

  const insertAtPos = useCallback(
    (pos: number, url: string) => {
      const ed = editorRef.current
      if (!ed) return
      ed.chain()
        .focus()
        .insertContentAt(pos, { type: 'image', attrs: { src: url } })
        .run()
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
              .then(({ url }) => {
                insertAtCursor(url)
              })
              .catch(err => {
                showUploadError(err)
              })
            return true
          }
        }
      }
      return false
    },
    [canInsertImages, insertAtCursor, showUploadError, uploadImage]
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
        .then(results => {
          const urls = results.map(r => r.url)
          const ed = editorRef.current
          if (!ed || urls.length === 0) return
          if (dropPos != null) {
            insertAtPos(dropPos, urls[0]!)
            for (let i = 1; i < urls.length; i += 1) {
              ed.chain().focus().setImage({ src: urls[i]! }).run()
            }
          } else {
            urls.forEach(url => ed.chain().focus().setImage({ src: url }).run())
          }
        })
        .catch(err => {
          showUploadError(err)
        })
      return true
    },
    [canInsertImages, editorRef, insertAtPos, showUploadError, uploadImage]
  )

  const insertImagesFromFileList = useCallback(
    (files: FileList | File[]) => {
      if (!canInsertImages) return
      const list = Array.from(files).filter(f => f.type.startsWith('image/'))
      if (list.length === 0) return
      void Promise.all(list.map(f => uploadImage(f)))
        .then(results => {
          results.forEach(({ url }) => {
            insertAtCursor(url)
          })
        })
        .catch(err => {
          showUploadError(err)
        })
    },
    [canInsertImages, insertAtCursor, showUploadError, uploadImage]
  )

  return { uploadImage, handlePaste, handleDrop, insertImagesFromFileList }
}
