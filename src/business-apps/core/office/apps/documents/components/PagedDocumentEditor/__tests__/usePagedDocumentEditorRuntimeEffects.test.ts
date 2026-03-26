import { mapSelectionRangeThroughTransaction } from '../hooks/usePagedDocumentEditorRuntimeEffects'

describe('mapSelectionRangeThroughTransaction', () => {
  it('maps a non-empty selection through document position shifts', () => {
    expect(
      mapSelectionRangeThroughTransaction(
        { from: 10, to: 18 },
        {
          mapping: {
            mapResult: (pos: number) => ({ pos: pos + 3, deleted: false })
          }
        },
        100
      )
    ).toEqual({ from: 13, to: 21 })
  })

  it('drops the selection when both mapped endpoints are deleted', () => {
    expect(
      mapSelectionRangeThroughTransaction(
        { from: 10, to: 18 },
        {
          mapping: {
            mapResult: () => ({ pos: 0, deleted: true })
          }
        },
        100
      )
    ).toBeNull()
  })

  it('drops the selection when clamping collapses the mapped range', () => {
    expect(
      mapSelectionRangeThroughTransaction(
        { from: 10, to: 18 },
        {
          mapping: {
            mapResult: (pos: number) => ({ pos: pos + 20, deleted: false })
          }
        },
        25
      )
    ).toBeNull()
  })
})
