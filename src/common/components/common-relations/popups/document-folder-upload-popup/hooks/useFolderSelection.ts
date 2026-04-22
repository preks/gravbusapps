import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDriveDropZone, type DroppedEntry } from '@/business-apps/core/office/apps/drive/hooks/useDriveDropZone'

export const PREVIEW_PAGE_SIZE = 20

/**
 * Patch `webkitRelativePath` on a File produced by a dropped directory
 * traversal so downstream consumers (specifically `buildFolderTree`) see
 * the correct folder path. The File prototype's property is read-only, so
 * we define a configurable own-property on the instance instead.
 */
function entryToPatchedFile(entry: DroppedEntry): File {
  const { file, relativePath } = entry
  if (file.webkitRelativePath === relativePath) return file

  Object.defineProperty(file, 'webkitRelativePath', {
    value: relativePath,
    configurable: true
  })
  return file
}

/**
 * Prompt the user to pick a root directory via the File System Access API.
 *
 * Split from the subsequent recursive walk so the caller can toggle a
 * spinner strictly around the walk (which can take seconds on huge folders)
 * rather than around the native picker dialog (during which the UI behind
 * it is obscured anyway).
 *
 * Returns:
 *   - `null`      when the API is unavailable (caller should fall back).
 *   - `undefined` when the user cancelled / denied permission.
 *   - the handle  when the user picked a folder.
 */
async function pickRootDirectoryHandle(): Promise<unknown | null | undefined> {
  const picker = (globalThis as any).showDirectoryPicker
  if (typeof picker !== 'function') return null

  try {
    return await picker({ mode: 'read' })
  } catch (error) {
    if ((error as DOMException | undefined)?.name !== 'AbortError') {
      console.error('Directory picker failed:', error)
    }
    return undefined
  }
}

async function walkFileSystemDirectoryHandle(dir: any, basePath: string, acc: DroppedEntry[]): Promise<void> {
  for await (const [, child] of dir.entries()) {
    if (child.kind === 'file') {
      const file: File = await child.getFile()
      acc.push({ file, relativePath: basePath + child.name })
    } else if (child.kind === 'directory') {
      await walkFileSystemDirectoryHandle(child, basePath + child.name + '/', acc)
    }
  }
}

/**
 * Walk every file under a picked root handle and return flattened
 * `{ file, relativePath }` entries. This is the slow part for large
 * folders — one `await child.getFile()` per file.
 */
async function walkPickedDirectoryHandle(rootHandle: any): Promise<DroppedEntry[]> {
  const entries: DroppedEntry[] = []
  await walkFileSystemDirectoryHandle(rootHandle, rootHandle.name + '/', entries)
  return entries
}

export interface UseFolderSelectionResult {
  readonly files: readonly File[]
  readonly isProcessing: boolean
  readonly previewLimit: number
  readonly isDragActive: boolean
  readonly inputRef: React.RefObject<HTMLInputElement>
  readonly dropZoneProps: Record<string, unknown>
  readonly openPicker: () => Promise<void>
  readonly onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  readonly showMorePreview: () => void
  readonly clearSelection: () => void
}

/**
 * Encapsulates every piece of stateful folder-selection behaviour the popup
 * needs: picker (File System Access + `<input webkitdirectory>` fallback),
 * drag-and-drop, processing spinner toggle, and preview-limit pagination.
 */
export function useFolderSelection(): UseFolderSelectionResult {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previewLimit, setPreviewLimit] = useState<number>(PREVIEW_PAGE_SIZE)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  useEffect(() => {
    setPreviewLimit(PREVIEW_PAGE_SIZE)
  }, [files])

  const showMorePreview = useCallback(() => {
    setPreviewLimit(current => current + PREVIEW_PAGE_SIZE)
  }, [])

  const handleDrop = useCallback((entries: DroppedEntry[]) => {
    setFiles(entries.map(entryToPatchedFile))
    setIsProcessing(false)
  }, [])

  const { isDragActive, dropZoneProps } = useDriveDropZone({ onDrop: handleDrop })

  const wrappedDropZoneProps = useMemo(
    () => ({
      ...dropZoneProps,
      onDrop: (event: React.DragEvent) => {
        if (event.dataTransfer.types.includes('Files')) {
          setIsProcessing(true)
        }
        return dropZoneProps.onDrop(event)
      }
    }),
    [dropZoneProps]
  )

  const openPicker = useCallback(async () => {
    const rootHandle = await pickRootDirectoryHandle()

    if (rootHandle === null) {
      const input = inputRef.current
      if (!input) return
      input.value = ''
      input.click()
      return
    }

    if (!rootHandle) return

    setIsProcessing(true)
    try {
      const fsEntries = await walkPickedDirectoryHandle(rootHandle)
      if (fsEntries.length > 0) {
        setFiles(fsEntries.map(entryToPatchedFile))
      }
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const onInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files
    if (!selected || selected.length === 0) return
    setIsProcessing(true)
    globalThis.setTimeout(() => {
      setFiles(Array.from(selected))
      setIsProcessing(false)
    }, 0)
  }, [])

  const clearSelection = useCallback(() => {
    setFiles([])
    setIsProcessing(false)
  }, [])

  return {
    files,
    isProcessing,
    previewLimit,
    isDragActive,
    inputRef,
    dropZoneProps: wrappedDropZoneProps,
    openPicker,
    onInputChange,
    showMorePreview,
    clearSelection
  }
}
