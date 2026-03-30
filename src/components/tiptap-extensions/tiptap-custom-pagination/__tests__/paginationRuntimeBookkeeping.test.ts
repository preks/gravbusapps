import {
  clearPaginationOwnedGrowthSuppression,
  consumePaginationHydrationDocChange,
  getPaginationOwnedGrowthSuppressionPageCount,
  markNextPaginationHydrationDocChange,
  setPaginationOwnedGrowthSuppression
} from '../paginationRuntimeBookkeeping'

describe('paginationRuntimeBookkeeping', () => {
  it('tracks and clears pagination-owned growth suppression per editor', () => {
    const editor = {}

    expect(getPaginationOwnedGrowthSuppressionPageCount(editor)).toBeNull()

    setPaginationOwnedGrowthSuppression(editor, 12)
    expect(getPaginationOwnedGrowthSuppressionPageCount(editor)).toBe(12)

    clearPaginationOwnedGrowthSuppression(editor)
    expect(getPaginationOwnedGrowthSuppressionPageCount(editor)).toBeNull()
  })

  it('consumes hydration-owned doc change markers one-by-one', () => {
    const editor = {}

    expect(consumePaginationHydrationDocChange(editor)).toBe(false)

    markNextPaginationHydrationDocChange(editor)
    markNextPaginationHydrationDocChange(editor)

    expect(consumePaginationHydrationDocChange(editor)).toBe(true)
    expect(consumePaginationHydrationDocChange(editor)).toBe(true)
    expect(consumePaginationHydrationDocChange(editor)).toBe(false)
  })
})
