/**
 * Tracks local spreadsheet persistence (cells, rows, snapshot) for the header save pill.
 * Merged in the viewer with useVersioning (checkpoints / autosave).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface SpreadsheetPersistenceIndicatorState {
  isSaving: boolean
  hasLocalDirty: boolean
  lastPersistedAt: Date | null
  error: string | null
}

export interface UseSpreadsheetPersistenceIndicatorResult extends SpreadsheetPersistenceIndicatorState {
  beginPersist: () => void
  endPersist: () => void
  markDirty: () => void
  /** Updates last persisted time; clears error. Optionally clears local dirty when queue is empty. */
  recordSuccess: (clearDirty: boolean) => void
  recordError: (message: string) => void
}

export function useSpreadsheetPersistenceIndicator(activeSheetId: string): UseSpreadsheetPersistenceIndicatorResult {
  const opsRef = useRef(0)
  const [state, setState] = useState<SpreadsheetPersistenceIndicatorState>({
    isSaving: false,
    hasLocalDirty: false,
    lastPersistedAt: null,
    error: null
  })

  const beginPersist = useCallback(() => {
    opsRef.current += 1
    if (opsRef.current === 1) {
      setState(s => ({ ...s, isSaving: true, error: null }))
    }
  }, [])

  const endPersist = useCallback(() => {
    opsRef.current = Math.max(0, opsRef.current - 1)
    if (opsRef.current === 0) {
      setState(s => ({ ...s, isSaving: false }))
    }
  }, [])

  const markDirty = useCallback(() => {
    setState(s => ({ ...s, hasLocalDirty: true, error: null }))
  }, [])

  const recordSuccess = useCallback((clearDirty: boolean) => {
    setState(s => ({
      ...s,
      lastPersistedAt: new Date(),
      error: null,
      hasLocalDirty: clearDirty ? false : s.hasLocalDirty
    }))
  }, [])

  const recordError = useCallback((message: string) => {
    setState(s => ({ ...s, error: message }))
  }, [])

  useEffect(() => {
    opsRef.current = 0
    setState({
      isSaving: false,
      hasLocalDirty: false,
      lastPersistedAt: null,
      error: null
    })
  }, [activeSheetId])

  return {
    ...state,
    beginPersist,
    endPersist,
    markDirty,
    recordSuccess,
    recordError
  }
}

export function maxPersistDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b
  if (!b) return a
  return a.getTime() >= b.getTime() ? a : b
}
