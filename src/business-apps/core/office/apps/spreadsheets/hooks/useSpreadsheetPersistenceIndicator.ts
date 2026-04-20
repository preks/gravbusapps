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
  /**
   * Clears persistence error. When clearDirty is true, also clears local dirty and updates last persisted time
   * (header “saved just now”). When false, leaves dirty/timestamp unchanged — use after partial persists (e.g. cell
   * batch done but workbook snapshot still pending).
   */
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
      setState(s => (s.isSaving && s.error === null ? s : { ...s, isSaving: true, error: null }))
    }
  }, [])

  const endPersist = useCallback(() => {
    opsRef.current = Math.max(0, opsRef.current - 1)
    if (opsRef.current === 0) {
      setState(s => (s.isSaving ? { ...s, isSaving: false } : s))
    }
  }, [])

  // Must be idempotent: this is called on every Univer snapshot lifecycle "checkpoint_scheduled"
  // event, which can fire many times per render cycle during workbook init. Returning the same
  // state reference when nothing changed prevents a re-render loop with SpreadsheetAppViewer
  // (see "Maximum update depth exceeded" on opening a brand-new sheet).
  const markDirty = useCallback(() => {
    setState(s => (s.hasLocalDirty && s.error === null ? s : { ...s, hasLocalDirty: true, error: null }))
  }, [])

  const recordSuccess = useCallback((clearDirty: boolean) => {
    setState(s => {
      const nextHasLocalDirty = clearDirty ? false : s.hasLocalDirty
      const nextLastPersistedAt = clearDirty ? new Date() : s.lastPersistedAt
      if (s.error === null && s.hasLocalDirty === nextHasLocalDirty && s.lastPersistedAt === nextLastPersistedAt) {
        return s
      }
      return {
        ...s,
        lastPersistedAt: nextLastPersistedAt,
        error: null,
        hasLocalDirty: nextHasLocalDirty
      }
    })
  }, [])

  const recordError = useCallback((message: string) => {
    setState(s => (s.error === message ? s : { ...s, error: message }))
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
