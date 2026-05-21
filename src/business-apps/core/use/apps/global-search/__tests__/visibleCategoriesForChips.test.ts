import type { SearchCategory } from '../types'
import { visibleCategoriesForChips } from '../utils'

describe('visibleCategoriesForChips', () => {
  it('returns all categories when no non-all category has a numeric count', () => {
    const categories: SearchCategory[] = [
      { id: 'all', label: 'All' },
      { id: 'PEOPLE', label: 'People' }
    ]
    expect(visibleCategoriesForChips(categories)).toEqual(categories)
  })

  it('keeps all and only categories with count > 0 when every non-all category has a numeric count', () => {
    const categories: SearchCategory[] = [
      { id: 'all', label: 'All' },
      { id: 'EMPTY', label: 'Empty', count: 0 },
      { id: 'HITS', label: 'Hits', count: 4 }
    ]
    expect(visibleCategoriesForChips(categories)).toEqual([
      { id: 'all', label: 'All' },
      { id: 'HITS', label: 'Hits', count: 4 }
    ])
  })

  it('keeps all categories when only some have counts (GET /results zero-query)', () => {
    const categories: SearchCategory[] = [
      { id: 'all', label: 'All' },
      { id: 'PEOPLE', label: 'People', count: 2 },
      { id: 'OFFICE', label: 'Office' }
    ]
    expect(visibleCategoriesForChips(categories)).toEqual(categories)
  })

  it('returns empty array when categories is not an array', () => {
    expect(visibleCategoriesForChips(undefined as unknown as SearchCategory[])).toEqual([])
  })
})
