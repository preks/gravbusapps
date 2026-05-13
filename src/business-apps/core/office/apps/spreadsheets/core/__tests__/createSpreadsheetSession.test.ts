import { createSpreadsheetSession } from '../createSpreadsheetSession'
import { SpreadsheetSessionMutationSources } from '../SpreadsheetSession'

describe('createSpreadsheetSession', () => {
  it('tracks active sheet state and preserves dirty markers across sheet replacements', () => {
    const session = createSpreadsheetSession({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      sheets: [
        {
          sheet: {
            id: 'sheet-1',
            name: 'Sheet 1',
            columns: [{ id: 'col-1', name: 'Name', type: 'text', label: 'Name' }],
            data: [{ _id: 'row-1', Name: 'Alice' }]
          } as never
        },
        {
          sheet: {
            id: 'sheet-2',
            name: 'Sheet 2',
            columns: [],
            data: []
          } as never
        }
      ]
    })

    session.applyMutation({
      sheetId: 'sheet-1',
      operations: [],
      source: SpreadsheetSessionMutationSources.LocalEdit
    })
    session.replaceSheetState(
      {
        id: 'sheet-1',
        name: 'Sheet 1',
        columns: [{ id: 'col-1', name: 'Name', type: 'text', label: 'Name' }],
        data: []
      } as never,
      [{ _id: 'row-1', Name: 'Alice Updated' }],
      3
    )

    expect(session.getActiveSheetState()).toMatchObject({
      sheetId: 'sheet-1',
      version: 3,
      rows: [{ _id: 'row-1', Name: 'Alice Updated' }],
      isDirty: true
    })

    session.setActiveSheet('sheet-2')
    expect(session.getState().activeSheetId).toBe('sheet-2')
  })

  it('applies persisted mutations and snapshot updates through shared session state', () => {
    const session = createSpreadsheetSession({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      sheets: [
        {
          sheet: {
            id: 'sheet-1',
            name: 'Sheet 1',
            columns: [{ id: 'col-1', name: 'Name', type: 'text', label: 'Name' }],
            data: [{ _id: 'row-1', Name: 'Alice' }]
          } as never
        }
      ]
    })

    session.applyMutation({
      sheetId: 'sheet-1',
      source: SpreadsheetSessionMutationSources.LocalEdit,
      operations: [
        {
          operationId: 'op-1',
          type: 'set_range',
          data: {
            cells: [{ rowId: 'row-1', columnName: 'Name', value: 'Alice Updated' }]
          }
        }
      ],
      response: {
        sheetId: 'sheet-1',
        newVersion: 8,
        appliedOperations: [{ operationId: 'op-1', type: 'set_range' }],
        operationResults: [],
        idempotentReplay: false
      }
    })
    session.updateWorkbookSnapshot({ workbook: true }, 4)
    session.markSheetNeedsGridMaterialization('sheet-1', 'remote replay')
    session.clearDirty('sheet-1')

    expect(session.getSheetState('sheet-1')).toMatchObject({
      version: 8,
      rows: [{ _id: 'row-1', Name: 'Alice Updated' }],
      needsGridMaterialization: true,
      gridMaterializationReason: 'remote replay',
      isDirty: false,
      lastMutationSource: SpreadsheetSessionMutationSources.LocalEdit
    })
    expect(session.getState()).toMatchObject({
      workbookSnapshotVersion: 4,
      workbookSnapshot: { workbook: true }
    })
  })

  it('applies replay delta changes through session ownership', () => {
    const session = createSpreadsheetSession({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      sheets: [
        {
          sheet: {
            id: 'sheet-1',
            name: 'Sheet 1',
            columns: [{ id: 'col-1', name: 'Name', type: 'text', label: 'Name' }],
            data: [{ _id: 'row-1', Name: 'Alice' }]
          } as never
        }
      ]
    })

    session.applyDeltaChanges({
      sheetId: 'sheet-1',
      source: SpreadsheetSessionMutationSources.RemoteApply,
      version: 5,
      changes: [
        {
          operationType: 'set_cell',
          payload: {
            rowId: 'row-1',
            columnName: 'Name',
            value: 'Alice Remote'
          }
        }
      ]
    })

    expect(session.getSheetState('sheet-1')).toMatchObject({
      version: 5,
      rows: [{ _id: 'row-1', Name: 'Alice Remote' }],
      lastMutationSource: SpreadsheetSessionMutationSources.RemoteApply
    })
  })

  it('notifies subscribe listeners on each state mutation', () => {
    const session = createSpreadsheetSession({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      sheets: [
        {
          sheet: {
            id: 'sheet-1',
            name: 'Sheet 1',
            columns: [{ id: 'col-1', name: 'Name', type: 'text', label: 'Name' }],
            data: [{ _id: 'row-1', Name: 'Alice' }]
          } as never
        }
      ]
    })

    let notifications = 0
    const unsub = session.subscribe(() => {
      notifications += 1
    })

    session.applyMutation({
      sheetId: 'sheet-1',
      operations: [],
      source: SpreadsheetSessionMutationSources.LocalEdit
    })
    expect(notifications).toBe(1)

    session.setActiveSheet('sheet-1')
    expect(notifications).toBe(2)

    unsub()
    session.applyMutation({
      sheetId: 'sheet-1',
      operations: [],
      source: SpreadsheetSessionMutationSources.LocalEdit
    })
    expect(notifications).toBe(2)
  })

  it('captures persisted baseline rows without disturbing live rows', () => {
    const session = createSpreadsheetSession({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      sheets: [
        {
          sheet: {
            id: 'sheet-1',
            name: 'Sheet 1',
            columns: [{ id: 'col-1', name: 'Name', type: 'text', label: 'Name' }],
            data: [{ _id: 'row-1', Name: 'Alice' }]
          } as never
        }
      ]
    })

    session.capturePersistedBaseline('sheet-1')
    session.applyMutation({
      sheetId: 'sheet-1',
      operations: [],
      source: SpreadsheetSessionMutationSources.LocalEdit
    })

    expect(session.getSheetState('sheet-1')).toMatchObject({
      rows: [{ _id: 'row-1', Name: 'Alice' }],
      persistedBaselineRows: [{ _id: 'row-1', Name: 'Alice' }],
      isDirty: true
    })
  })

  it('replaceSheetState preserves unchanged row references when next rows reuse prior row objects', () => {
    const sheetMeta = {
      id: 'sheet-1',
      name: 'Sheet 1',
      columns: [{ id: 'col-1', name: 'Name', type: 'text', label: 'Name' }],
      data: [
        { _id: 'row-a', Name: 'A' },
        { _id: 'row-b', Name: 'B' }
      ]
    } as never
    const session = createSpreadsheetSession({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      sheets: [{ sheet: sheetMeta }]
    })

    const before = session.getSheetState('sheet-1')!
    const unchangedRow = before.rows[1]
    const changedRow = { ...before.rows[0], Name: 'A2' }
    session.replaceSheetState(sheetMeta, [changedRow, unchangedRow], 2)

    const after = session.getSheetState('sheet-1')!
    expect(after.rows[0]).not.toBe(before.rows[0])
    expect(after.rows[0]).toEqual({ _id: 'row-a', Name: 'A2' })
    expect(after.rows[1]).toBe(unchangedRow)
  })
})
