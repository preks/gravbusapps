/**
 * useFileAttachments - Hook for managing email file attachments.
 * Handles file selection, base64 conversion, drag-and-drop, and size validation.
 */

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { SendAttachment } from '../types'

const MAX_TOTAL_SIZE = 25 * 1024 * 1024 // 25 MB
const MAX_SINGLE_FILE = 10 * 1024 * 1024 // 10 MB per file

export interface UseFileAttachmentsOptions {
  /** Translation function for toast messages. When omitted, falls back to English. */
  t?: (key: string, vars?: Record<string, string | number>) => string
}

/** Reads a File as base64 string (without data-uri prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useFileAttachments(options: UseFileAttachmentsOptions = {}) {
  const { t } = options
  const [attachments, setAttachments] = useState<SendAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalSize = attachments.reduce((sum, a) => sum + (a.size || 0), 0)

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const newAttachments: SendAttachment[] = []

      for (const file of fileArray) {
        if (file.size > MAX_SINGLE_FILE) {
          const msg = t
            ? t('composer-toast-file-size-exceeded', { name: file.name })
            : `"${file.name}" exceeds the 10 MB per-file limit`
          toast.error(msg)
          continue
        }

        const runningTotal = totalSize + newAttachments.reduce((s, a) => s + (a.size || 0), 0) + file.size
        if (runningTotal > MAX_TOTAL_SIZE) {
          const msg = t ? t('composer-toast-total-size-exceeded') : 'Total attachments exceed 25 MB limit'
          toast.error(msg)
          break
        }

        // Skip exact duplicates
        if (attachments.some(a => a.filename === file.name && a.size === file.size)) continue

        try {
          const content = await fileToBase64(file)
          newAttachments.push({
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            content,
            size: file.size
          })
        } catch {
          const msg = t ? t('composer-toast-file-read-failed', { name: file.name }) : `Failed to read "${file.name}"`
          toast.error(msg)
        }
      }

      if (newAttachments.length > 0) {
        setAttachments(prev => [...prev, ...newAttachments])
      }
    },
    [attachments, totalSize, t]
  )

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearAttachments = useCallback(() => setAttachments([]), [])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        addFiles(e.target.files)
        e.target.value = ''
      }
    },
    [addFiles]
  )

  // Drag-and-drop handlers for the drop zone element
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  return {
    attachments,
    totalSize,
    isDragging,
    fileInputRef,
    addFiles,
    removeAttachment,
    clearAttachments,
    openFilePicker,
    handleFileInputChange,
    dragHandlers: { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop }
  }
}
