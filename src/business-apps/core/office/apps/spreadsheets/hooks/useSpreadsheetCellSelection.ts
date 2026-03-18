/**
 * useSpreadsheetCellSelection
 *
 * Manages cell selection state and cursor emission for collaboration.
 */

import { useState, useCallback, useRef } from 'react'

export interface SelectedCell {
  rowId: string
  colId: string
  rowIndex: number
  colIndex: number
}

export interface UseSpreadsheetCellSelectionProps {
  activeSheetId: string
  isCollaborationConnected: boolean
  emitCursor: (position: { line?: number; column?: number; offset?: number; path?: string[] }) => void
}

export interface SpreadsheetCellSelectionState {
  selectedCell: SelectedCell | null
  setSelectedCell: (cell: SelectedCell | null) => void
  selectedCellRef: React.MutableRefObject<SelectedCell | null>
  emitCursorImmediate: (rowId: string, colId: string, rowIndex: number, colIndex: number) => void
}

export function useSpreadsheetCellSelection({
  activeSheetId,
  isCollaborationConnected,
  emitCursor
}: UseSpreadsheetCellSelectionProps): SpreadsheetCellSelectionState {
  // Cell selection state
  const [selectedCell, setSelectedCellState] = useState<SelectedCell | null>(null)

  // Ref to track latest selectedCell for stable closures
  const selectedCellRef = useRef(selectedCell)
  selectedCellRef.current = selectedCell

  // Stable setter that updates both state and ref
  const setSelectedCell = useCallback((cell: SelectedCell | null) => {
    selectedCellRef.current = cell
    setSelectedCellState(cell)
  }, [])

  // Emit cursor position immediately for collaboration
  const emitCursorImmediate = useCallback(
    (rowId: string, colId: string, rowIndex: number, colIndex: number) => {
      if (isCollaborationConnected) {
        emitCursor({
          path: [activeSheetId, rowId, colId],
          line: rowIndex,
          column: colIndex
        })
      }
    },
    [activeSheetId, isCollaborationConnected, emitCursor]
  )

  return {
    selectedCell,
    setSelectedCell,
    selectedCellRef,
    emitCursorImmediate
  }
}
