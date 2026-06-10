import { prefersCanonicalReloadForMaterializationReason } from '../spreadsheetGridMaterialization'

describe('prefersCanonicalReloadForMaterializationReason', () => {
  it('returns true for column reorder repair reasons', () => {
    expect(prefersCanonicalReloadForMaterializationReason('column_reorder_structural_repair')).toBe(true)
    expect(prefersCanonicalReloadForMaterializationReason('column_reorder_no_native_handler')).toBe(true)
  })

  it('returns false for non-structural materialization reasons', () => {
    expect(prefersCanonicalReloadForMaterializationReason('set_style')).toBe(false)
    expect(prefersCanonicalReloadForMaterializationReason('sheet_grid_materialization')).toBe(false)
    expect(prefersCanonicalReloadForMaterializationReason(undefined)).toBe(false)
  })
})
