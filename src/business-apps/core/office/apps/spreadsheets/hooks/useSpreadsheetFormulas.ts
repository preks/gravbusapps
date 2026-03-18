/**
 * useSpreadsheetFormulas
 *
 * Manages formula editing state, selection mode, and related refs.
 */

import { useState, useRef, useEffect } from 'react'
import type { FormulaSelectionMode } from '../views/EditableCell'

export type { FormulaSelectionMode }

export interface FormulaSelectedCell {
  rowIndex: number
  colIndex: number
}

export interface UseSpreadsheetFormulasProps {
  selectedCellRowId?: string
  selectedCellColId?: string
}

export interface SpreadsheetFormulasState {
  // Formula selection mode
  formulaSelectionMode: FormulaSelectionMode
  setFormulaSelectionMode: React.Dispatch<React.SetStateAction<FormulaSelectionMode>>
  formulaSelectionModeRef: React.MutableRefObject<FormulaSelectionMode>

  // Formula selected cells (for highlighting)
  formulaSelectedCells: FormulaSelectedCell[]
  setFormulaSelectedCells: React.Dispatch<React.SetStateAction<FormulaSelectedCell[]>>

  // Formula value refs
  currentFormulaValueRef: React.MutableRefObject<string>
  formulaBarInputRef: React.MutableRefObject<HTMLInputElement | null>

  // Display state setter (syncs with ref)
  setCurrentFormulaDisplay: React.Dispatch<React.SetStateAction<string | null>>
}

export function useSpreadsheetFormulas({
  selectedCellRowId,
  selectedCellColId
}: UseSpreadsheetFormulasProps): SpreadsheetFormulasState {
  // Formula selection mode state
  const [formulaSelectionMode, setFormulaSelectionMode] = useState<FormulaSelectionMode>(null)
  const formulaSelectionModeRef = useRef<FormulaSelectionMode>(null)

  // Track cells selected during formula mode for highlighting
  const [formulaSelectedCells, setFormulaSelectedCells] = useState<FormulaSelectedCell[]>([])

  // Formula value refs
  const currentFormulaValueRef = useRef<string>('')
  const formulaBarInputRef = useRef<HTMLInputElement>(null)

  // Display state (setter syncs with ref, value used indirectly)
  const [, setCurrentFormulaDisplay] = useState<string | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    formulaSelectionModeRef.current = formulaSelectionMode
  }, [formulaSelectionMode])

  // Focus formula bar when entering formula selection mode
  useEffect(() => {
    if (!formulaSelectionMode) return
    setTimeout(() => {
      const input = formulaBarInputRef.current
      if (!input) return
      input.focus()
      const len = input.value?.length ?? 0
      input.setSelectionRange(len, len)
    }, 0)
  }, [formulaSelectionMode])

  // Clear formula selected cells when exiting formula mode
  useEffect(() => {
    if (!formulaSelectionMode) {
      setFormulaSelectedCells([])
    }
  }, [formulaSelectionMode])

  // Clear formula display when selected cell changes (unless in formula mode)
  useEffect(() => {
    if (!formulaSelectionMode) {
      currentFormulaValueRef.current = ''
      setCurrentFormulaDisplay(null)
    }
  }, [selectedCellRowId, selectedCellColId, formulaSelectionMode])

  return {
    formulaSelectionMode,
    setFormulaSelectionMode,
    formulaSelectionModeRef,
    formulaSelectedCells,
    setFormulaSelectedCells,
    currentFormulaValueRef,
    formulaBarInputRef,
    setCurrentFormulaDisplay
  }
}
