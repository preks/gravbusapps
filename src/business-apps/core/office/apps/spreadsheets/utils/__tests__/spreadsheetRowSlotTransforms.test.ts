import {
  applyDeleteRowSlotsTransform,
  applyInsertRowSlotsTransform,
  applyMoveRowSlotsTransform
} from '../spreadsheetRowSlotTransforms'
import { createIdentityRowProjectionModel } from '../spreadsheetRowProjection'

describe('spreadsheetRowSlotTransforms', () => {
  it('shifts sparse rows when inserting an empty slot', () => {
    const rows = [
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2 },
      { _id: 'row-25', _rowUuid: 'row-25', _gridRowIndex: 25 },
      { _id: 'row-99', _rowUuid: 'row-99', _gridRowIndex: 99 }
    ]

    expect(applyInsertRowSlotsTransform(rows, 14, 1).map(row => row._gridRowIndex)).toEqual([2, 26, 100])
  })

  it('deletes empty virtual slots while shifting materialized rows below', () => {
    const rows = [
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2 },
      { _id: 'row-25', _rowUuid: 'row-25', _gridRowIndex: 25 },
      { _id: 'row-99', _rowUuid: 'row-99', _gridRowIndex: 99 }
    ]

    expect(applyDeleteRowSlotsTransform(rows, 14, 1).map(row => row._gridRowIndex)).toEqual([2, 24, 98])
  })

  it('moves sparse slots using array-splice semantics', () => {
    const rows = [
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2 },
      { _id: 'row-3', _rowUuid: 'row-3', _gridRowIndex: 3 },
      { _id: 'row-25', _rowUuid: 'row-25', _gridRowIndex: 25 },
      { _id: 'row-99', _rowUuid: 'row-99', _gridRowIndex: 99 }
    ]

    expect(applyMoveRowSlotsTransform(rows, 2, 2, 10).map(row => row._gridRowIndex)).toEqual([8, 9, 25, 99])
  })
})

describe('createIdentityRowProjectionModel', () => {
  it('maps visible indexes to the same virtual slots in identity mode', () => {
    const model = createIdentityRowProjectionModel([
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2 },
      { _id: 'client-row-9', _clientRowId: 'client-row-9', _gridRowIndex: 9 }
    ])

    expect(model.resolveVisibleRowIndex(5)).toEqual({
      visibleRowIndex: 5,
      virtualSlot: 5,
      rowId: undefined,
      clientRowId: undefined,
      isMaterialized: false
    })
    expect(model.resolveVirtualSlot(9)).toEqual({
      virtualSlot: 9,
      row: { _id: 'client-row-9', _clientRowId: 'client-row-9', _gridRowIndex: 9 },
      rowId: undefined,
      clientRowId: 'client-row-9',
      isMaterialized: true
    })
  })
})
