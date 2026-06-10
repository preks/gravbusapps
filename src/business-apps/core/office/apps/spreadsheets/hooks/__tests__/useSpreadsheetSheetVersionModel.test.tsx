import React from 'react'
import { act, renderHook } from '@testing-library/react'

import type { SpreadsheetSession } from '../../core'
import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
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

  it('resolveTrackedSheetVersion ignores newer network-known versions until applied locally', () => {
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

    expect(result.current.resolveTrackedSheetVersion('sheet-a')).toBe(100)
    expect(result.current.resolveKnownSheetVersion('sheet-a')).toBe(536)
  })

  it('keeps tracked sheet snapshot version behind network-known snapshot version until hydration applies', () => {
    const spreadsheetSessionRef = { current: null as SpreadsheetSession | null }
    const activeSheetIdRef = { current: 'sheet-a' }
    const appSheetsRef = {
      current: [{ ...createMinimalSheet('sheet-a', 5), sheetSnapshotVersion: 2 }]
    }

    const { result } = renderHook(() =>
      useSpreadsheetSheetVersionModel({
        appId: 'app-1',
        spreadsheetSessionRef,
        activeSheetIdRef,
        appSheetsRef,
        sheets: appSheetsRef.current,
        activeSheetId: 'sheet-a',
        activeSheetVersion: 5
      })
    )

    act(() => {
      result.current.rememberKnownSheetSnapshotVersion('sheet-a', 10)
    })

    expect(result.current.resolveTrackedSheetSnapshotVersion('sheet-a')).toBe(2)
    expect(result.current.resolveKnownSheetSnapshotVersion('sheet-a')).toBe(10)
  })

  it('never downgrades known sheet version on refreshBaseVersionBeforeWrite', async () => {
    const spreadsheetSessionRef = { current: null as SpreadsheetSession | null }
    const activeSheetIdRef = { current: 'sheet-a' }
    const appSheetsRef = { current: [createMinimalSheet('sheet-a', 5)] }
    jest.spyOn(SpreadsheetApiService, 'getSheet').mockResolvedValue({ version: 8 } as never)

    const { result } = renderHook(() =>
      useSpreadsheetSheetVersionModel({
        appId: 'app-1',
        spreadsheetSessionRef,
        activeSheetIdRef,
        appSheetsRef,
        sheets: appSheetsRef.current,
        activeSheetId: 'sheet-a',
        activeSheetVersion: 5
      })
    )

    act(() => {
      result.current.rememberKnownSheetVersion('sheet-a', 20)
    })

    let refreshed = 0
    await act(async () => {
      refreshed = await result.current.refreshBaseVersionBeforeWrite('sheet-a', 5)
    })

    expect(refreshed).toBe(20)
    expect(result.current.resolveKnownSheetVersion('sheet-a')).toBe(20)
  })

  it('keeps rememberKnownSheetVersion monotonic when a lower version is reported', () => {
    const spreadsheetSessionRef = { current: null as SpreadsheetSession | null }
    const activeSheetIdRef = { current: 'sheet-a' }
    const appSheetsRef = { current: [createMinimalSheet('sheet-a', 5)] }

    const { result } = renderHook(() =>
      useSpreadsheetSheetVersionModel({
        appId: 'app-1',
        spreadsheetSessionRef,
        activeSheetIdRef,
        appSheetsRef,
        sheets: appSheetsRef.current,
        activeSheetId: 'sheet-a',
        activeSheetVersion: 5
      })
    )

    act(() => {
      result.current.rememberKnownSheetVersion('sheet-a', 15)
      result.current.rememberKnownSheetVersion('sheet-a', 12)
    })

    expect(result.current.resolveKnownSheetVersion('sheet-a')).toBe(15)
  })
})
