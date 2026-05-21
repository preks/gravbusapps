import React from 'react'
import { act, renderHook } from '@testing-library/react'

import type { SpreadsheetSession } from '../../core'
import type { CollaborationOperation } from '../../services/SpreadsheetCollaborationManager'
import type { SpreadsheetSheet } from '../../types'
import { useSpreadsheetSheetVersionModel } from '../useSpreadsheetSheetVersionModel'

function createMinimalSheet(id: string, version = 1): SpreadsheetSheet {
  return {
    id,
    name: id,
    columns: [],
    data: [],
    views: [],
    viewType: 'table',
    version
  } as SpreadsheetSheet
}

describe('useSpreadsheetSheetVersionModel', () => {
  it('suppresses collaboration echoes for recently remembered local versions', () => {
    const spreadsheetSessionRef = { current: null as SpreadsheetSession | null }
    const activeSheetIdRef = { current: 'sheet-a' }
    const appSheetsRef = { current: [createMinimalSheet('sheet-a', 3)] }

    const { result } = renderHook(() =>
      useSpreadsheetSheetVersionModel({
        appId: 'app-1',
        spreadsheetSessionRef,
        activeSheetIdRef,
        appSheetsRef,
        sheets: appSheetsRef.current,
        activeSheetId: 'sheet-a',
        activeSheetVersion: 3
      })
    )

    act(() => {
      result.current.rememberLocalCommittedVersion(42)
    })

    const op: CollaborationOperation = {
      version: 42,
      operation: { type: 'cell_edit', broadcastOnly: false }
    } as CollaborationOperation

    expect(result.current.shouldIgnoreRecentlyCommittedOperation(op)).toBe(true)
  })

  it('suppresses batch_operations echoes when batch id was committed locally', () => {
    const spreadsheetSessionRef = { current: null as SpreadsheetSession | null }
    const activeSheetIdRef = { current: 'sheet-a' }
    const appSheetsRef = { current: [createMinimalSheet('sheet-a')] }

    const { result } = renderHook(() =>
      useSpreadsheetSheetVersionModel({
        appId: 'app-1',
        spreadsheetSessionRef,
        activeSheetIdRef,
        appSheetsRef,
        sheets: appSheetsRef.current,
        activeSheetId: 'sheet-a',
        activeSheetVersion: 1
      })
    )

    act(() => {
      result.current.rememberRecentLocalBatchId('batch-local-xyz')
    })

    const op: CollaborationOperation = {
      operation: {
        type: 'batch_operations',
        data: { batchId: 'batch-local-xyz' }
      }
    } as CollaborationOperation

    expect(result.current.shouldIgnoreRecentlyCommittedOperation(op)).toBe(true)
  })

  it('does not suppress batch_operations when tab id differs from the remembered local tab', () => {
    const spreadsheetSessionRef = { current: null as SpreadsheetSession | null }
    const activeSheetIdRef = { current: 'sheet-a' }
    const appSheetsRef = { current: [createMinimalSheet('sheet-a')] }

    const { result } = renderHook(() =>
      useSpreadsheetSheetVersionModel({
        appId: 'app-1',
        spreadsheetSessionRef,
        activeSheetIdRef,
        appSheetsRef,
        sheets: appSheetsRef.current,
        activeSheetId: 'sheet-a',
        activeSheetVersion: 1
      })
    )

    act(() => {
      result.current.rememberRecentLocalBatchId('batch-local-xyz', 'tab-a')
    })

    const op: CollaborationOperation = {
      operation: {
        type: 'batch_operations',
        data: { batchId: 'batch-local-xyz', tabId: 'tab-b' }
      }
    } as CollaborationOperation

    expect(result.current.shouldIgnoreRecentlyCommittedOperation(op)).toBe(false)
  })

  it('suppresses batch_operations when tab id matches the remembered local tab', () => {
    const spreadsheetSessionRef = { current: null as SpreadsheetSession | null }
    const activeSheetIdRef = { current: 'sheet-a' }
    const appSheetsRef = { current: [createMinimalSheet('sheet-a')] }

    const { result } = renderHook(() =>
      useSpreadsheetSheetVersionModel({
        appId: 'app-1',
        spreadsheetSessionRef,
        activeSheetIdRef,
        appSheetsRef,
        sheets: appSheetsRef.current,
        activeSheetId: 'sheet-a',
        activeSheetVersion: 1
      })
    )

    act(() => {
      result.current.rememberRecentLocalBatchId('batch-local-xyz', 'tab-a')
    })

    const op: CollaborationOperation = {
      operation: {
        type: 'batch_operations',
        data: { batchId: 'batch-local-xyz', tabId: 'tab-a' }
      }
    } as CollaborationOperation

    expect(result.current.shouldIgnoreRecentlyCommittedOperation(op)).toBe(true)
  })

  it('resolveKnownSheetVersion uses the maximum of session, app metadata, tracked map, and known network versions', () => {
    const spreadsheetSessionRef = {
      current: {
        getSheetState: (id: string) => (id === 'sheet-a' ? { version: 100, rows: [], columns: [] } : undefined),
        replaceSheetState: jest.fn()
      }
    } as React.MutableRefObject<SpreadsheetSession | null>
    const activeSheetIdRef = { current: 'sheet-a' }
    const appSheetsRef = { current: [createMinimalSheet('sheet-a', 50)] }

    const { result } = renderHook(() =>
      useSpreadsheetSheetVersionModel({
        appId: 'app-1',
        spreadsheetSessionRef,
        activeSheetIdRef,
        appSheetsRef,
        sheets: appSheetsRef.current,
        activeSheetId: 'sheet-a',
        activeSheetVersion: 50
      })
    )

    act(() => {
      result.current.rememberKnownSheetVersion('sheet-a', 536)
    })

    expect(result.current.resolveKnownSheetVersion('sheet-a')).toBe(536)

    act(() => {
      result.current.rememberSheetVersion('sheet-a', 600)
    })

    expect(result.current.resolveKnownSheetVersion('sheet-a')).toBe(600)
  })
})
