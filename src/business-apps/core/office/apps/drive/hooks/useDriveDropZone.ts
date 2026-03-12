import { useState, useCallback, useRef, type DragEvent } from 'react'

export interface DroppedEntry {
  file: File
  relativePath: string
}

interface UseDriveDropZoneOptions {
  onDrop: (entries: DroppedEntry[]) => void
  disabled?: boolean
}

async function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

async function readDirectoryEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader()
  const all: FileSystemEntry[] = []
  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject))
  let batch = await readBatch()
  while (batch.length > 0) {
    all.push(...batch)
    batch = await readBatch()
  }
  return all
}

async function processEntry(entry: FileSystemEntry, basePath: string): Promise<DroppedEntry[]> {
  if (entry.isFile) {
    const file = await readFileEntry(entry as FileSystemFileEntry)
    return [{ file, relativePath: basePath + entry.name }]
  }
  if (entry.isDirectory) {
    const children = await readDirectoryEntries(entry as FileSystemDirectoryEntry)
    const results: DroppedEntry[] = []
    for (const child of children) {
      results.push(...(await processEntry(child, basePath + entry.name + '/')))
    }
    return results
  }
  return []
}

export function useDriveDropZone({ onDrop, disabled }: UseDriveDropZoneOptions) {
  const [isDragActive, setIsDragActive] = useState(false)
  const counter = useRef(0)

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled || !e.dataTransfer.types.includes('Files')) return
      counter.current++
      setIsDragActive(true)
    },
    [disabled]
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.dataTransfer.types.includes('Files')) return
    counter.current--
    if (counter.current <= 0) {
      counter.current = 0
      setIsDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      counter.current = 0
      setIsDragActive(false)
      if (disabled || !e.dataTransfer.types.includes('Files')) return

      const items = e.dataTransfer.items
      const entries: DroppedEntry[] = []

      if (items?.length) {
        const fsEntries: FileSystemEntry[] = []
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.()
          if (entry) fsEntries.push(entry)
        }
        for (const fsEntry of fsEntries) {
          entries.push(...(await processEntry(fsEntry, '')))
        }
      }

      if (!entries.length) {
        const files = e.dataTransfer.files
        for (let i = 0; i < files.length; i++) {
          entries.push({ file: files[i], relativePath: files[i].name })
        }
      }

      if (entries.length > 0) onDrop(entries)
    },
    [disabled, onDrop]
  )

  return {
    isDragActive,
    dropZoneProps: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  }
}
