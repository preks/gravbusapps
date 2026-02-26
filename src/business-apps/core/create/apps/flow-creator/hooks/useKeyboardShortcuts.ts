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

function isTypingInInput(target: HTMLElement): boolean {
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

function handleDeleteKeyEvent(
  e: KeyboardEvent,
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  requestDeleteNode: (id: string) => void
): boolean {
  if (e.key !== 'Delete' && e.key !== 'Backspace') return false
  if (selectedNodeId) {
    e.preventDefault()
    requestDeleteNode(selectedNodeId)
    return true
  }
  if (selectedEdgeId) {
    e.preventDefault()
    return true
  }
  return false
}

function handleUndoRedoKeyEvent(e: KeyboardEvent, isCtrlOrMeta: boolean, undo: () => void, redo: () => void): boolean {
  if (isCtrlOrMeta && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
    return true
  }
  if ((isCtrlOrMeta && e.key === 'y') || (isCtrlOrMeta && e.key === 'z' && e.shiftKey)) {
    e.preventDefault()
    redo()
    return true
  }
  return false
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
      const target = e.target as HTMLElement
      if (isTypingInInput(target)) return

      const isCtrlOrMeta = e.ctrlKey || e.metaKey

      if (handleDeleteKeyEvent(e, selectedNodeId, selectedEdgeId, requestDeleteNode)) return
      if (handleUndoRedoKeyEvent(e, isCtrlOrMeta, undo, redo)) return

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
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        useFlowStudioStore.getState().selectNode(null)
      }
    },
    [enabled, selectedNodeId, selectedEdgeId, requestDeleteNode, duplicateNode, undo, redo, onSave, onSimulate]
  )

  useEffect(() => {
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
