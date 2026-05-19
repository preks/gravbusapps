import type { SearchCategory } from '../types'

export function isAllCategoryId(id: string): boolean {
  return id.toLowerCase() === 'all'
}

/**
 * When the backend sends a **full** facet vector (every non-"all" category has a numeric count),
 * hide chips with zero hits. If only some categories have counts — typical for GET /results
 * zero-query — show every category the API returned so the modal matches the results payload.
 */
export function visibleCategoriesForChips(categories: SearchCategory[]): SearchCategory[] {
  if (!Array.isArray(categories)) {
    return []
  }

  const nonAll = categories.filter(category => !isAllCategoryId(category.id))
  if (nonAll.length === 0) {
    return categories
  }

  const fullFacetVector = nonAll.every(category => typeof category.count === 'number')
  if (!fullFacetVector) {
    return categories
  }

  return categories.filter(category => isAllCategoryId(category.id) || (category.count ?? 0) > 0)
}
