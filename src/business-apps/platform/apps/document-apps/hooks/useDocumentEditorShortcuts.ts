/**
 * useDocumentEditorShortcuts
 *
 * Registers keyboard shortcuts (Cmd+S save, Cmd+Shift+M inline comment) and
 * context menu (right-click on selection → add inline comment) for the document editor.
 */

import { useEffect } from 'react'

export interface UseDocumentEditorShortcutsParams {
  onSave: () => void
  onAddInlineComment: () => void
  editor: { state: { selection: { from: number; to: number } } } | null
  editorContainerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Sets up global keydown listener and ProseMirror context menu for save + inline comment.
 */
export function useDocumentEditorShortcuts({
  onSave,
  onAddInlineComment,
  editor,
  editorContainerRef
}: UseDocumentEditorShortcutsParams): void {
  // Keyboard: Cmd/Ctrl+S save, Cmd/Ctrl+Shift+M add inline comment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        onSave()
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'm') {
        e.preventDefault()
        onAddInlineComment()
      }
    }
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [onSave, onAddInlineComment])

  // Context menu: right-click on selected text → add inline comment
  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      if (!editor) return
      const { from, to } = editor.state.selection
      if (from === to) return
      e.preventDefault()
      onAddInlineComment()
    }

    const editorElement = editorContainerRef.current?.querySelector('.ProseMirror')
    if (editorElement) {
      editorElement.addEventListener('contextmenu', handleContextMenu)
      return () => editorElement.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [editor, editorContainerRef, onAddInlineComment])
}
