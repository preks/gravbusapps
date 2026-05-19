import type { SearchCategory, SearchItem, SearchSection } from '../types'

function primaryCategoryId(item: SearchItem): string {
  const id = item.categoryIds.find(cid => cid !== 'all')
  return id ?? 'uncategorized'
}

function isPeopleCategoryGroupKey(key: string): boolean {
  return key.toUpperCase() === 'PEOPLE'
}

/**
 * Splits the flat `results` RESULTS bucket into one RESULTS section per primary category,
 * titled from `categories` labels and ordered to match chip order.
 */
export function expandResultsSectionsByCategory(
  sections: SearchSection[],
  categories: SearchCategory[]
): SearchSection[] {
  const labelById = new Map(categories.map(c => [c.id, c.label]))
  const orderIndex = new Map<string, number>()
  categories.forEach((c, i) => {
    orderIndex.set(c.id, i)
  })

  return sections.flatMap(section => {
    if (section.kind !== 'RESULTS' || section.id !== 'results') {
      return [section]
    }
    if (section.items.length === 0) {
      return [section]
    }

    const groups = new Map<string, SearchItem[]>()
    for (const item of section.items) {
      const key = primaryCategoryId(item)
      const list = groups.get(key)
      if (list) {
        list.push(item)
      } else {
        groups.set(key, [item])
      }
    }

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      const aPeople = isPeopleCategoryGroupKey(a)
      const bPeople = isPeopleCategoryGroupKey(b)
      if (aPeople !== bPeople) {
        return aPeople ? -1 : 1
      }

      const ai = orderIndex.get(a)
      const bi = orderIndex.get(b)
      if (ai !== undefined && bi !== undefined && ai !== bi) {
        return ai - bi
      }
      if (ai !== undefined && bi === undefined) {
        return -1
      }
      if (bi !== undefined && ai === undefined) {
        return 1
      }
      return a.localeCompare(b)
    })

    return sortedKeys.map(key => ({
      ...section,
      id: `results-${key}`,
      title: key === 'uncategorized' ? 'Other' : (labelById.get(key) ?? key),
      total: groups.get(key)!.length,
      items: groups.get(key)!
    }))
  })
}
