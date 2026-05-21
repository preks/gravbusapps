import type { SearchItem, SearchCategory, SearchSection } from '../types'
import { expandResultsSectionsByCategory } from '../utils'

const target = { kind: 'URL' as const, href: '/' }

function item(id: string, categoryIds: string[]): SearchItem {
  return {
    id,
    name: id,
    type: 'T',
    typeLabel: 'L',
    categoryIds,
    primaryTarget: target,
    analytics: { provider: 'p', trackingId: 't', rank: 1 }
  }
}

describe('expandResultsSectionsByCategory', () => {
  const categories: SearchCategory[] = [
    { id: 'people', label: 'People' },
    { id: 'office', label: 'Office' },
    { id: 'crm', label: 'CRM' }
  ]

  it('leaves non-results sections unchanged', () => {
    const top: SearchSection = {
      id: 'top',
      kind: 'TOP_MATCH',
      title: 'Top match',
      presentation: 'LIST',
      items: [item('a', ['people'])]
    }
    expect(expandResultsSectionsByCategory([top], categories)).toEqual([top])
  })

  it('does not split a RESULTS section with a different id', () => {
    const other: SearchSection = {
      id: 'custom',
      kind: 'RESULTS',
      title: 'Custom',
      presentation: 'LIST',
      items: [item('a', ['people']), item('b', ['crm'])]
    }
    expect(expandResultsSectionsByCategory([other], categories)).toEqual([other])
  })

  it('splits id results by primary category and orders by categories array', () => {
    const results: SearchSection = {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation: 'LIST',
      items: [item('c1', ['crm']), item('p1', ['people']), item('o1', ['office'])]
    }
    const expanded = expandResultsSectionsByCategory([results], categories)
    expect(expanded.map(s => s.id)).toEqual(['results-people', 'results-office', 'results-crm'])
    expect(expanded.map(s => s.title)).toEqual(['People', 'Office', 'CRM'])
    expect(expanded[0]?.items.map(i => i.id)).toEqual(['p1'])
    expect(expanded[1]?.items.map(i => i.id)).toEqual(['o1'])
    expect(expanded[2]?.items.map(i => i.id)).toEqual(['c1'])
  })

  it('lists PEOPLE before other categories even when category chips are ordered alphabetically', () => {
    const categoriesAlpha: SearchCategory[] = [
      { id: 'OFFICE', label: 'Office' },
      { id: 'ORGANIZATION', label: 'Organization' },
      { id: 'PEOPLE', label: 'People' }
    ]
    const results: SearchSection = {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation: 'LIST',
      items: [item('doc', ['OFFICE']), item('org', ['ORGANIZATION']), item('person', ['PEOPLE'])]
    }
    const expanded = expandResultsSectionsByCategory([results], categoriesAlpha)
    expect(expanded.map(s => s.id)).toEqual(['results-PEOPLE', 'results-OFFICE', 'results-ORGANIZATION'])
  })

  it('uses Other for items without a non-all category', () => {
    const results: SearchSection = {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation: 'LIST',
      items: [item('x', ['all'])]
    }
    const expanded = expandResultsSectionsByCategory([results], categories)
    expect(expanded).toHaveLength(1)
    expect(expanded[0]?.id).toBe('results-uncategorized')
    expect(expanded[0]?.title).toBe('Other')
  })
})
