/**
 * useDocumentEditorShortcuts
 *
 * Registers keyboard shortcuts (Cmd+S save, Cmd+Shift+M inline comment)
 * for the document editor.
 */

import { useEffect } from 'react'

export interface UseDocumentEditorShortcutsParams {
  onSave: () => void
  onAddInlineComment: (
    contextMenuPosition?: { x: number; y: number },
    selectionRange?: { from: number; to: number }
  ) => void
  onAiEdit?: () => void
  /** Optional: Mod+k opens link dialog when editor has focus */
  onOpenLinkDialog?: () => void
  editorContainerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Sets up global keydown listener for save, inline comment, and link editing.
 */
export function useDocumentEditorShortcuts({
  onSave,
  onAddInlineComment,
  onAiEdit,
  onOpenLinkDialog,
  editorContainerRef
}: UseDocumentEditorShortcutsParams): void {
  // Keyboard: Cmd/Ctrl+S save, Cmd/Ctrl+Shift+M add inline comment, Cmd/Ctrl+Shift+E AI edit, Mod+k link dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const inEditor = editorContainerRef.current?.contains(document.activeElement)

      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault()
        onSave()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'm') {
        e.preventDefault()
        onAddInlineComment()
      }
      if (onAiEdit && inEditor && (e.ctrlKey || e.metaKey) && e.shiftKey && key === 'e') {
        e.preventDefault()
        onAiEdit()
      }
      if (onOpenLinkDialog && inEditor && (e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault()
        onOpenLinkDialog()
      }
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [onSave, onAddInlineComment, onAiEdit, onOpenLinkDialog, editorContainerRef])
}
