import { getViewerRowVisualIndex } from './spreadsheetPeerRowHydration'
import {
  createClientRowRef,
  type SpreadsheetRowRef,
  getClientRowIdentity,
  getViewerRowIdentityCandidates,
  resolveBackendRowIdForViewerRow,
  type ViewerRow
} from './spreadsheetRowIdentity'

export interface SpreadsheetStableRowTarget {
  rowId: string
  rowRef?: SpreadsheetRowRef
  backendRowId?: string
  clientRowId?: string
  rowIndex: number
}

export interface SpreadsheetRowSlotIdentityState {
  healthy: boolean
  reason: string | null
  slots: Map<number, SpreadsheetStableRowTarget>
}

type SheetSlotIdentityState = SpreadsheetRowSlotIdentityState

function buildSlotSignature(target: SpreadsheetStableRowTarget): string {
  return [
    target.rowIndex,
    target.clientRowId ?? '',
    target.backendRowId ?? '',
    target.rowRef?.kind === 'clientHandle' ? target.rowRef.clientRowId : ''
  ].join(':')
}

function buildStableRowTarget(
  row: ViewerRow,
  rowIndex: number,
  isUuid: (value: string) => boolean
): SpreadsheetStableRowTarget | null {
  const backendRowId = resolveBackendRowIdForViewerRow(row, isUuid)
  const clientRowId = getClientRowIdentity(row)
  const rowId = backendRowId ?? clientRowId
  if (!rowId) return null
  return {
    rowId,
    rowRef: !backendRowId && clientRowId ? createClientRowRef(clientRowId) : undefined,
    backendRowId,
    clientRowId: clientRowId || undefined,
    rowIndex
  }
}

function buildSlotMap(rows: ViewerRow[], isUuid: (value: string) => boolean): Map<number, SpreadsheetStableRowTarget> {
  const slots = new Map<number, SpreadsheetStableRowTarget>()
  rows.forEach((row, index) => {
    const rowIndex = getViewerRowVisualIndex(row, index)
    const target = buildStableRowTarget(row, rowIndex, isUuid)
    if (target) {
      slots.set(rowIndex, target)
    }
  })
  return slots
}

export interface SpreadsheetRowSlotIdentityRegistry {
  clear: () => void
  clearSheet: (sheetId: string) => void
  markUnhealthy: (sheetId: string, reason: string) => void
  markHealthy: (sheetId: string) => void
  syncRows: (sheetId: string, rows: ViewerRow[], isUuid: (value: string) => boolean) => SpreadsheetRowSlotIdentityState
  resolveRowTarget: (sheetId: string, rowIndex: number) => SpreadsheetStableRowTarget | null
  hasStructuralMismatch: (sheetId: string, rows: ViewerRow[], isUuid: (value: string) => boolean) => boolean
  getState: (sheetId: string) => SpreadsheetRowSlotIdentityState | null
  bindBackendRowId: (sheetId: string, clientRowId: string, backendRowId: string) => void
}

export function rowSlotTargetMatchesRowIdentity(
  target: SpreadsheetStableRowTarget | null | undefined,
  row: ViewerRow | null | undefined,
  isUuid: (value: string) => boolean
): boolean {
  if (!target || !row) return false
  const backendRowId = resolveBackendRowIdForViewerRow(row, isUuid)
  if (backendRowId && target.backendRowId) {
    return backendRowId === target.backendRowId
  }
  const clientRowId = getClientRowIdentity(row)
  if (clientRowId && target.clientRowId) {
    return clientRowId === target.clientRowId
  }
  if (backendRowId) {
    return target.rowId === backendRowId
  }
  if (clientRowId) {
    return target.rowId === clientRowId
  }
  return false
}

export function createSpreadsheetRowSlotIdentityRegistry(): SpreadsheetRowSlotIdentityRegistry {
  const states = new Map<string, SheetSlotIdentityState>()

  const getOrCreateState = (sheetId: string): SheetSlotIdentityState => {
    const existing = states.get(sheetId)
    if (existing) return existing
    const created: SheetSlotIdentityState = {
      healthy: true,
      reason: null,
      slots: new Map()
    }
    states.set(sheetId, created)
    return created
  }

  return {
    clear: () => {
      states.clear()
    },
    clearSheet: sheetId => {
      states.delete(sheetId)
    },
    markUnhealthy: (sheetId, reason) => {
      const state = getOrCreateState(sheetId)
      state.healthy = false
      state.reason = reason
    },
    markHealthy: sheetId => {
      const state = getOrCreateState(sheetId)
      state.healthy = true
      state.reason = null
    },
    syncRows: (sheetId, rows, isUuid) => {
      const state = getOrCreateState(sheetId)
      state.slots = buildSlotMap(rows, isUuid)
      return {
        healthy: state.healthy,
        reason: state.reason,
        slots: new Map(state.slots)
      }
    },
    resolveRowTarget: (sheetId, rowIndex) => {
      const state = states.get(sheetId)
      if (!state) return null
      return state.slots.get(rowIndex) ?? null
    },
    hasStructuralMismatch: (sheetId, rows, isUuid) => {
      const state = states.get(sheetId)
      if (!state) return false
      const nextSlots = buildSlotMap(rows, isUuid)
      const currentEntries = Array.from(state.slots.values()).sort((a, b) => a.rowIndex - b.rowIndex)
      const nextEntries = Array.from(nextSlots.values()).sort((a, b) => a.rowIndex - b.rowIndex)
      if (currentEntries.length !== nextEntries.length) return true
      return currentEntries.some((entry, index) => {
        const next = nextEntries[index]
        return !next || buildSlotSignature(entry) !== buildSlotSignature(next)
      })
    },
    getState: sheetId => {
      const state = states.get(sheetId)
      if (!state) return null
      return {
        healthy: state.healthy,
        reason: state.reason,
        slots: new Map(state.slots)
      }
    },
    bindBackendRowId: (sheetId, clientRowId, backendRowId) => {
      if (!clientRowId || !backendRowId) return
      const state = getOrCreateState(sheetId)
      for (const [rowIndex, target] of state.slots.entries()) {
        if (
          target.clientRowId !== clientRowId &&
          !getViewerRowIdentityCandidates({ _id: target.rowId, _clientRowId: target.clientRowId }).includes(clientRowId)
        ) {
          continue
        }
        state.slots.set(rowIndex, {
          rowId: backendRowId,
          backendRowId,
          clientRowId,
          rowIndex
        })
      }
    }
  }
}
