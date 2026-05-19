import type { GlobalSearchResultSelectable, SearchItem, SearchSection } from '../types'

const hasPeopleCategory = (item: SearchItem): boolean =>
  item.categoryIds.some(categoryId => categoryId.toUpperCase() === 'PEOPLE')

const hasNavigationCategory = (item: SearchItem): boolean =>
  item.categoryIds.some(categoryId => categoryId.toUpperCase() === 'NAVIGATION')

/**
 * True for discovery trending rails that are entirely People hits (e.g. `trending-employees`).
 */
export const isPeopleTrendingSwimlaneSection = (section: SearchSection): boolean =>
  section.kind === 'TRENDING' && section.items.length > 0 && section.items.every(hasPeopleCategory)

/**
 * True for discovery trending rails that are entirely Navigation/Page hits (e.g. `trending-pages`).
 */
export const isNavigationTrendingSection = (section: SearchSection): boolean =>
  section.kind === 'TRENDING' && section.items.length > 0 && section.items.every(hasNavigationCategory)

/**
 * True when this section should use the horizontal people swimlane (same UX as `people-swimlane`).
 * Covers `results-PEOPLE` from category expansion and an undivided `results` bucket that is all People hits.
 */
export const isPeopleResultsSwimlaneSection = (section: SearchSection): boolean => {
  if (section.kind !== 'RESULTS') {
    return false
  }

  if (section.id.startsWith('results-')) {
    const categoryKey = section.id.slice('results-'.length)
    if (categoryKey.toUpperCase() === 'PEOPLE') {
      return true
    }
  }

  if (section.id === 'results' && section.items.length > 0) {
    return section.items.every(hasPeopleCategory)
  }

  return false
}

export const flattenSelectableResults = (sections: SearchSection[]): GlobalSearchResultSelectable[] => {
  return sections.flatMap(section =>
    section.items
      .filter(item => item.primaryTarget || item.type === 'QUERY' || item.id.startsWith('query:'))
      .map(item => ({
        id: `${section.id}:${item.id}`,
        item,
        sectionId: section.id,
        sectionTitle: section.title
      }))
  )
}

/**
 * True for sections rendered as horizontal rows where ArrowLeft/ArrowRight
 * moves inside the section and ArrowUp/ArrowDown moves across sections.
 */
export const isHorizontalSwimlaneSection = (section: SearchSection): boolean =>
  section.presentation === 'GRID' ||
  section.kind === 'RECENT' ||
  section.kind === 'SUGGESTIONS' ||
  section.id === 'people-swimlane' ||
  isPeopleTrendingSwimlaneSection(section) ||
  isNavigationTrendingSection(section)
