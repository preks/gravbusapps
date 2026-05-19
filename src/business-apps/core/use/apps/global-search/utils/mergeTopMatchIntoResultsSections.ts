import type { SearchItem, SearchSection } from '../types'

const DEFAULT_PRESENTATION: SearchSection['presentation'] = 'LIST'

/**
 * UI-only: drops TOP_MATCH sections by prepending their items into the flat `results` bucket
 * so hits stay visible after category expansion (backend still may send top-match + results).
 */
export function mergeTopMatchIntoResultsSections(sections: SearchSection[]): SearchSection[] {
  const topItems: SearchItem[] = []
  const rest: SearchSection[] = []

  for (const section of sections) {
    if (section.kind === 'TOP_MATCH') {
      topItems.push(...section.items)
    } else {
      rest.push(section)
    }
  }

  if (topItems.length === 0) {
    return sections
  }

  const resultsIndex = rest.findIndex(s => s.kind === 'RESULTS' && s.id === 'results')
  if (resultsIndex >= 0) {
    const resultsSection = rest[resultsIndex]
    const next = [...rest]
    next[resultsIndex] = {
      ...resultsSection,
      items: [...topItems, ...resultsSection.items],
      total: topItems.length + resultsSection.items.length
    }
    return next
  }

  const presentation = rest.find(s => s.presentation)?.presentation ?? DEFAULT_PRESENTATION

  return [
    ...rest,
    {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation,
      items: topItems,
      total: topItems.length
    }
  ]
}
