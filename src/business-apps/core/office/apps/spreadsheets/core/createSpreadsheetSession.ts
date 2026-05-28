import type { SpreadsheetSheet } from '../types'
import type {
  SpreadsheetSessionDeltaChangesDescriptor,
  SpreadsheetSession,
  SpreadsheetSessionMutationDescriptor,
  SpreadsheetSessionState
} from './SpreadsheetSession'
import {
  applySpreadsheetSessionDeltaChanges,
  applySpreadsheetSessionMutation,
  buildSpreadsheetSessionState,
  captureSpreadsheetSessionPersistedBaseline,
  captureSpreadsheetSessionPersistedBaselineForOperations,
  clearSpreadsheetSessionDirty,
  clearSpreadsheetSessionSheetGridMaterialization,
  markSpreadsheetSessionSheetNeedsGridMaterialization,
  replaceSpreadsheetSessionSheetState,
  updateSpreadsheetSessionWorkbookSnapshot
} from './spreadsheetSessionReducers'

interface CreateSpreadsheetSessionOptions {
  appId: string
  activeSheetId: string
  sheets: Array<{ sheet: SpreadsheetSheet; rows?: Array<Record<string, unknown>>; version?: number }>
  workbookSnapshotVersion?: number
  workbookSnapshot?: Record<string, unknown> | null
}

export const createSpreadsheetSession = (options: CreateSpreadsheetSessionOptions): SpreadsheetSession => {
  let state: SpreadsheetSessionState = buildSpreadsheetSessionState(options)
  const listeners = new Set<() => void>()

  const emitChange = (): void => {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    getState(): SpreadsheetSessionState {
      return state
    },

    getActiveSheetState() {
      return state.sheets[state.activeSheetId] ?? null
    },

    getSheetState(sheetId: string) {
      return state.sheets[sheetId] ?? null
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    setActiveSheet(sheetId: string): void {
      state = {
        ...state,
        activeSheetId: sheetId
      }
      emitChange()
    },

    replaceSheetState(sheet: SpreadsheetSheet, rows: Array<Record<string, unknown>>, version?: number): void {
      state = replaceSpreadsheetSessionSheetState(state, sheet, rows, version)
      emitChange()
    },

    updateWorkbookSnapshot(snapshot: Record<string, unknown> | null, version: number): void {
      state = updateSpreadsheetSessionWorkbookSnapshot(state, snapshot, version)
      emitChange()
    },

    applyMutation(descriptor: SpreadsheetSessionMutationDescriptor): void {
      state = applySpreadsheetSessionMutation(state, descriptor)
      emitChange()
    },

    applyDeltaChanges(descriptor: SpreadsheetSessionDeltaChangesDescriptor): void {
      state = applySpreadsheetSessionDeltaChanges(state, descriptor)
      emitChange()
    },

    capturePersistedBaseline(sheetId: string): void {
      state = captureSpreadsheetSessionPersistedBaseline(state, sheetId)
      emitChange()
    },

    capturePersistedBaselineForOperations(sheetId: string, operations): void {
      state = captureSpreadsheetSessionPersistedBaselineForOperations(state, sheetId, operations)
      emitChange()
    },

    markSheetNeedsGridMaterialization(sheetId: string, reason: string): void {
      state = markSpreadsheetSessionSheetNeedsGridMaterialization(state, sheetId, reason)
      emitChange()
    },

    clearSheetGridMaterialization(sheetId: string): void {
      state = clearSpreadsheetSessionSheetGridMaterialization(state, sheetId)
      emitChange()
    },

    clearDirty(sheetId: string): void {
      state = clearSpreadsheetSessionDirty(state, sheetId)
      emitChange()
    }
  }
}
