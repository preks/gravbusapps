import { createTestSpreadsheetColumn } from '../../core/test-fixtures/spreadsheetCoreTestFixtures'
import {
  buildExcelCollectionSubmitFormData,
  EXCEL_COLLECTION_FORM_INTERNAL_KEYS
} from '../spreadsheetCollectionSubmission'

describe('buildExcelCollectionSubmitFormData', () => {
  it('returns undefined when there are no rows', () => {
    expect(buildExcelCollectionSubmitFormData({ sourceRows: [], visibleColumns: [] })).toBeUndefined()
    expect(buildExcelCollectionSubmitFormData({ sourceRows: undefined, visibleColumns: [] })).toBeUndefined()
  })

  it('returns undefined when no row has user-visible non-internal data', () => {
    expect(
      buildExcelCollectionSubmitFormData({
        sourceRows: [{ _id: '1', _isBulkCollectionPending: true }],
        visibleColumns: []
      })
    ).toBeUndefined()
  })

  it('maps first substantive row and attaches column labels', () => {
    const cols = [
      createTestSpreadsheetColumn({ id: 'c1', name: 'qty', label: 'Qty', order: 0 }),
      createTestSpreadsheetColumn({ id: 'c2', name: 'note', label: 'Note', order: 1, isVisible: false })
    ]
    const form = buildExcelCollectionSubmitFormData({
      sourceRows: [{ _id: 'r1', qty: 3, note: 'x' }],
      visibleColumns: cols
    })
    expect(form).toEqual({
      qty: 3,
      note: 'x',
      __columnLabels__: { qty: 'Qty' }
    })
  })

  it('documents internal keys used for filtering', () => {
    expect(EXCEL_COLLECTION_FORM_INTERNAL_KEYS.has('_workflow_id')).toBe(true)
  })
})
