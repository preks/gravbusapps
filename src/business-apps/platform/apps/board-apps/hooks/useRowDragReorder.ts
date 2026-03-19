/**
 * useRowDragReorder — lightweight native HTML5 drag-and-drop hook for row
 * reordering. Zero per-row overhead (no hooks on individual rows), works
 * seamlessly with virtualized lists.
 */

import { useRef, useState, useCallback } from 'react'
import type { BoardRow } from '../types'

export interface DropTarget {
  id: string
  position: 'above' | 'below'
}

export function useRowDragReorder(
  displayRows: BoardRow[],
  onReorderRow?: (rowId: string, afterRowId: string | null, beforeRowId: string | null) => void
) {
  const dragRowIdRef = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, rowId: string) => {
    dragRowIdRef.current = rowId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', rowId)
    const tr = (e.target as HTMLElement).closest('tr')
    if (tr) e.dataTransfer.setDragImage(tr, 20, 12)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, rowId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragRowIdRef.current === rowId) {
      setDropTarget(null)
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const position: 'above' | 'below' = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'
    setDropTarget(prev => (prev?.id === rowId && prev.position === position ? prev : { id: rowId, position }))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null
    if (related && (e.currentTarget as HTMLElement).contains(related)) return
    setDropTarget(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetRowId: string) => {
      e.preventDefault()
      const draggedId = dragRowIdRef.current
      if (!draggedId || draggedId === targetRowId || !onReorderRow) {
        setDropTarget(null)
        dragRowIdRef.current = null
        return
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const position: 'above' | 'below' = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'

      const withoutDragged = displayRows.filter(r => r.id !== draggedId)
      const targetIdx = withoutDragged.findIndex(r => r.id === targetRowId)
      if (targetIdx === -1) {
        setDropTarget(null)
        dragRowIdRef.current = null
        return
      }

      let afterRowId: string | null = null
      let beforeRowId: string | null = null

      if (position === 'above') {
        afterRowId = targetIdx > 0 ? withoutDragged[targetIdx - 1].id : null
        beforeRowId = targetRowId
      } else {
        afterRowId = targetRowId
        beforeRowId = targetIdx < withoutDragged.length - 1 ? withoutDragged[targetIdx + 1].id : null
      }

      onReorderRow(draggedId, afterRowId, beforeRowId)
      setDropTarget(null)
      dragRowIdRef.current = null
    },
    [displayRows, onReorderRow]
  )

  const handleDragEnd = useCallback(() => {
    setDropTarget(null)
    dragRowIdRef.current = null
  }, [])

  return {
    dragRowIdRef,
    dropTarget,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  }
}
