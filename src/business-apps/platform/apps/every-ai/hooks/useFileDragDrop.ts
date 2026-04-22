import { useState, useCallback, useRef, type DragEvent } from 'react'

interface UseFileDragDropOptions {
  onFilesDropped: (files: FileList) => void
  disabled?: boolean
}

export function useFileDragDrop({ onFilesDropped, disabled }: UseFileDragDropOptions): {
  isDragActive: boolean
  dragProps: {
    onDragEnter: (e: DragEvent<HTMLDivElement>) => void
    onDragOver: (e: DragEvent<HTMLDivElement>) => void
    onDragLeave: (e: DragEvent<HTMLDivElement>) => void
    onDrop: (e: DragEvent<HTMLDivElement>) => void
  }
} {
  const [isDragActive, setIsDragActive] = useState(false)
  const enterCounter = useRef(0)

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled || !e.dataTransfer.types.includes('Files')) return
      enterCounter.current++
      setIsDragActive(true)
    },
    [disabled]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.dataTransfer.types.includes('Files')) return
    enterCounter.current--
    if (enterCounter.current <= 0) {
      enterCounter.current = 0
      setIsDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      enterCounter.current = 0
      setIsDragActive(false)
      if (disabled) return
      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        onFilesDropped(files)
      }
    },
    [disabled, onFilesDropped]
  )

  return {
    isDragActive,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  }
}
