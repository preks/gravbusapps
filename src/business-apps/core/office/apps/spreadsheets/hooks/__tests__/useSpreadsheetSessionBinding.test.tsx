import { renderHook, act } from '@testing-library/react'

import { useSpreadsheetSessionBinding } from '../useSpreadsheetSessionBinding'
import type { SpreadsheetSheet } from '../../types'

function makeSheet(id: string, data: Record<string, unknown>[]): SpreadsheetSheet {
  return {
    id,
    name: 'Sheet',
    viewType: 'table',
    columns: [
      {
        id: 'col1',
        name: 'a',
        label: 'A',
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        order: 0
      }
    ],
    views: [],
    data,
    settings: {}
  }
}

describe('useSpreadsheetSessionBinding', () => {
  it('keeps the same SpreadsheetSession instance when activeSheetId changes (stable per appId)', async () => {
    const sheetVersionRef = { current: 0 }
    const workbookSnapshotVersionRef = { current: 0 }
    const sessionRef = { current: null }
    const sheets = [makeSheet('s1', [{ _id: 'r1', v: 1 }]), makeSheet('s2', [{ _id: 'r2', v: 2 }])]

    const { result, rerender } = renderHook(
      ({ activeSheetId }: { activeSheetId: string }) =>
        useSpreadsheetSessionBinding({
          appId: 'app-1',
          activeSheetId,
          sheets,
          sheetVersionRef,
          workbookSnapshotVersionRef,
          sessionRef
        }),
      { initialProps: { activeSheetId: 's1' } }
    )

    const firstSession = result.current
    await act(async () => {})
    expect(firstSession.getState().activeSheetId).toBe('s1')

    await act(async () => {
      rerender({ activeSheetId: 's2' })
    })

    expect(result.current).toBe(firstSession)
    expect(result.current.getState().activeSheetId).toBe('s2')
  })

  it('preserves existing session rows when props sheet.data updates for the same sheet', async () => {
    const sheetVersionRef = { current: 0 }
    const workbookSnapshotVersionRef = { current: 0 }
    const sessionRef = { current: null }
    let sheets = [makeSheet('s1', [{ _id: 'r1', k: 'from_props' }])]

    const { result, rerender } = renderHook(
      ({ sheetsArg, activeSheetId }: { sheetsArg: SpreadsheetSheet[]; activeSheetId: string }) =>
        useSpreadsheetSessionBinding({
          appId: 'app-1',
          activeSheetId,
          sheets: sheetsArg,
          sheetVersionRef,
          workbookSnapshotVersionRef,
          sessionRef
        }),
      { initialProps: { sheetsArg: sheets, activeSheetId: 's1' } }
    )

    await act(async () => {})

    const ownedRow = { _id: 'r1', k: 'edited_in_session' }
    act(() => {
      result.current.replaceSheetState(sheets[0], [ownedRow], 1)
    })
    expect(result.current.getSheetState('s1')?.rows).toEqual([ownedRow])

    sheets = [makeSheet('s1', [{ _id: 'r1', k: 'new_server_payload' }])]
    await act(async () => {
      rerender({ sheetsArg: sheets, activeSheetId: 's1' })
    })

    expect(result.current.getSheetState('s1')?.rows).toEqual([ownedRow])
  })
})
