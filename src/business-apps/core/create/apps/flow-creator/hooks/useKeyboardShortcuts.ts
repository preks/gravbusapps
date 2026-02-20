/**
 * useKeyboardShortcuts - Keyboard shortcut handler for Flow Studio.
 * Supports: Delete, Ctrl+Z/Y (undo/redo), Ctrl+D (duplicate), Ctrl+S (save).
 */

import { useEffect, useCallback } from 'react'
import { useFlowStudioStore } from './useFlowStudioStore'

interface UseKeyboardShortcutsOptions {
  onSave?: () => void
  onSimulate?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { onSave, onSimulate, enabled = true } = options

  const selectedNodeId = useFlowStudioStore(s => s.selectedNodeId)
  const selectedEdgeId = useFlowStudioStore(s => s.selectedEdgeId)
  const requestDeleteNode = useFlowStudioStore(s => s.requestDeleteNode)
  const duplicateNode = useFlowStudioStore(s => s.duplicateNode)
  const undo = useFlowStudioStore(s => s.undo)
  const redo = useFlowStudioStore(s => s.redo)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return

      // Don't capture shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey

      // Delete selected node/edge
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault()
        requestDeleteNode(selectedNodeId)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        e.preventDefault()
        // Edges are not deleted directly; users delete steps instead.
        return
      }

      // Undo: Ctrl+Z
      if (isCtrlOrMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((isCtrlOrMeta && e.key === 'y') || (isCtrlOrMeta && e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
        return
      }

      // Duplicate: Ctrl+D
      if (isCtrlOrMeta && e.key === 'd' && selectedNodeId) {
        e.preventDefault()
        duplicateNode(selectedNodeId)
        return
      }

      // Save: Ctrl+S
      if (isCtrlOrMeta && e.key === 's') {
        e.preventDefault()
        onSave?.()
        return
      }

      // Simulate: Ctrl+Shift+S
      if (isCtrlOrMeta && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        onSimulate?.()
        return
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        useFlowStudioStore.getState().selectNode(null)
        return
      }
    },
    [enabled, selectedNodeId, selectedEdgeId, requestDeleteNode, duplicateNode, undo, redo, onSave, onSimulate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
