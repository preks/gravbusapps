import type { SpreadsheetColumn } from '../../types'
import { buildSnapshotReconcilePlan } from '../snapshotReconcilePlan'

const makeColumn = (name: string, order: number): SpreadsheetColumn => ({
  id: name,
  name,
  label: name,
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order
})

describe('buildSnapshotReconcilePlan', () => {
  const visibleColumns = [makeColumn('column_a', 0), makeColumn('column_b', 1)]
  const getBackendRowId = (row: Record<string, unknown>) => String(row._rowUuid || '')

  it('treats grid-omitted cells as clears when the persisted baseline had values', () => {
    const result = buildSnapshotReconcilePlan({
      cellData: {
        0: {
          0: 'w'
        }
      },
      visibleColumns,
      currentRows: [
        {
          _id: 'row-0',
          _rowUuid: 'backend-row-0',
          column_a: 'w',
          column_b: null
        }
      ],
      persistedBaseline: [
        {
          _id: 'row-0',
          _rowUuid: 'backend-row-0',
          column_a: 'w',
          column_b: 'w'
        }
      ],
      getBackendRowId,
      treatMissingCellsAsNull: true
    })

    expect(result.updatesByRowIndex).toEqual(
      new Map([
        [
          0,
          {
            column_b: null
          }
        ]
      ])
    )
    expect(result.reconcileCells).toEqual([
      {
        rowId: 'backend-row-0',
        columnName: 'column_b',
        value: null
      }
    ])
  })

  it('does not emit clears for cells that were already empty', () => {
    const result = buildSnapshotReconcilePlan({
      cellData: {},
      visibleColumns,
      currentRows: [
        {
          _id: 'row-0',
          _rowUuid: 'backend-row-0',
          column_a: null,
          column_b: null
        }
      ],
      persistedBaseline: [
        {
          _id: 'row-0',
          _rowUuid: 'backend-row-0'
        }
      ],
      getBackendRowId,
      treatMissingCellsAsNull: true
    })

    expect(result.updatesByRowIndex.size).toBe(0)
    expect(result.reconcileCells).toEqual([])
  })

  it('keeps sparse snapshot mode for non-grid sources', () => {
    const result = buildSnapshotReconcilePlan({
      cellData: {
        0: {
          0: 'w'
        }
      },
      visibleColumns,
      currentRows: [
        {
          _id: 'row-0',
          _rowUuid: 'backend-row-0',
          column_a: 'w',
          column_b: 'w'
        }
      ],
      persistedBaseline: [
        {
          _id: 'row-0',
          _rowUuid: 'backend-row-0',
          column_a: null,
          column_b: 'w'
        }
      ],
      getBackendRowId
    })

    expect(result.updatesByRowIndex).toEqual(
      new Map([
        [
          0,
          {
            column_a: 'w'
          }
        ]
      ])
    )
    expect(result.reconcileCells).toEqual([
      {
        rowId: 'backend-row-0',
        columnName: 'column_a',
        value: 'w'
      }
    ])
  })
})
