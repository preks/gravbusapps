import type { SearchItem, SearchSection } from '../types'
import { expandResultsSectionsByCategory, mergeTopMatchIntoResultsSections } from '../utils'

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

describe('mergeTopMatchIntoResultsSections', () => {
  it('returns the same array when there is no TOP_MATCH section', () => {
    const sections: SearchSection[] = [
      {
        id: 'results',
        kind: 'RESULTS',
        title: 'Results',
        presentation: 'LIST',
        items: [item('a', ['people'])]
      }
    ]
    expect(mergeTopMatchIntoResultsSections(sections)).toBe(sections)
  })

  it('prepends TOP_MATCH items into id results and removes TOP_MATCH sections', () => {
    const top: SearchSection = {
      id: 'top',
      kind: 'TOP_MATCH',
      title: 'Top match',
      presentation: 'HERO',
      items: [item('top1', ['people'])]
    }
    const results: SearchSection = {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation: 'LIST',
      items: [item('r1', ['office'])],
      total: 1
    }
    const merged = mergeTopMatchIntoResultsSections([top, results])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.kind).toBe('RESULTS')
    expect(merged[0]?.id).toBe('results')
    expect(merged[0]?.items.map(i => i.id)).toEqual(['top1', 'r1'])
    expect(merged[0]?.total).toBe(2)
  })

  it('creates a synthetic results section when only TOP_MATCH is present', () => {
    const top: SearchSection = {
      id: 'top',
      kind: 'TOP_MATCH',
      title: 'Top match',
      presentation: 'LIST',
      items: [item('only', ['people'])]
    }
    const merged = mergeTopMatchIntoResultsSections([top])
    expect(merged).toEqual([
      {
        id: 'results',
        kind: 'RESULTS',
        title: 'Results',
        presentation: 'LIST',
        items: [item('only', ['people'])],
        total: 1
      }
    ])
  })

  it('concatenates multiple TOP_MATCH sections before results items', () => {
    const t1: SearchSection = {
      id: 't1',
      kind: 'TOP_MATCH',
      title: 'T1',
      presentation: 'LIST',
      items: [item('a', ['people'])]
    }
    const t2: SearchSection = {
      id: 't2',
      kind: 'TOP_MATCH',
      title: 'T2',
      presentation: 'LIST',
      items: [item('b', ['people'])]
    }
    const results: SearchSection = {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation: 'LIST',
      items: [item('c', ['office'])]
    }
    const merged = mergeTopMatchIntoResultsSections([t1, t2, results])
    expect(merged[0]?.items.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('with expand: PEOPLE bucket lists top-match people before office', () => {
    const categories = [
      { id: 'OFFICE', label: 'Office' },
      { id: 'PEOPLE', label: 'People' }
    ]
    const top: SearchSection = {
      id: 'top',
      kind: 'TOP_MATCH',
      title: 'Top match',
      presentation: 'LIST',
      items: [item('star', ['PEOPLE'])]
    }
    const results: SearchSection = {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation: 'LIST',
      items: [item('desk', ['OFFICE'])]
    }
    const expanded = expandResultsSectionsByCategory(mergeTopMatchIntoResultsSections([top, results]), categories)
    expect(expanded.map(s => s.id)).toEqual(['results-PEOPLE', 'results-OFFICE'])
    expect(expanded[0]?.items.map(i => i.id)).toEqual(['star'])
    expect(expanded[1]?.items.map(i => i.id)).toEqual(['desk'])
  })
})
