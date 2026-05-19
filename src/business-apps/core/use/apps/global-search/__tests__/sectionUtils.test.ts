import type { SearchItem, SearchSection } from '../types'
import { isHorizontalSwimlaneSection, isPeopleResultsSwimlaneSection, isPeopleTrendingSwimlaneSection } from '../utils'

const urlTarget = { kind: 'URL' as const, href: '/' }

function personItem(id: string): SearchItem {
  return {
    id,
    name: id,
    type: 'EMPLOYEE',
    typeLabel: 'Employee',
    categoryIds: ['PEOPLE'],
    primaryTarget: urlTarget,
    analytics: { provider: 'p', trackingId: 't', rank: 1 }
  }
}

describe('isPeopleResultsSwimlaneSection', () => {
  it('is true for expanded results-PEOPLE', () => {
    const section: SearchSection = {
      id: 'results-PEOPLE',
      kind: 'RESULTS',
      title: 'People',
      presentation: 'LIST',
      items: [personItem('1'), personItem('2')]
    }
    expect(isPeopleResultsSwimlaneSection(section)).toBe(true)
  })

  it('is true for results-people (case)', () => {
    const section: SearchSection = {
      id: 'results-people',
      kind: 'RESULTS',
      title: 'People',
      presentation: 'LIST',
      items: [personItem('1')]
    }
    expect(isPeopleResultsSwimlaneSection(section)).toBe(true)
  })

  it('is true for flat results when every item is PEOPLE category', () => {
    const section: SearchSection = {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation: 'LIST',
      items: [personItem('1'), personItem('2')]
    }
    expect(isPeopleResultsSwimlaneSection(section)).toBe(true)
  })

  it('is false for flat results with mixed categories', () => {
    const section: SearchSection = {
      id: 'results',
      kind: 'RESULTS',
      title: 'Results',
      presentation: 'LIST',
      items: [
        personItem('1'),
        {
          id: 'f1',
          name: 'Doc',
          type: 'FILE',
          typeLabel: 'Spreadsheet',
          categoryIds: ['OFFICE'],
          primaryTarget: urlTarget,
          analytics: { provider: 'p', trackingId: 't', rank: 2 }
        }
      ]
    }
    expect(isPeopleResultsSwimlaneSection(section)).toBe(false)
  })

  it('is false for results-OFFICE', () => {
    const section: SearchSection = {
      id: 'results-OFFICE',
      kind: 'RESULTS',
      title: 'Office',
      presentation: 'LIST',
      items: []
    }
    expect(isPeopleResultsSwimlaneSection(section)).toBe(false)
  })
})

describe('isPeopleTrendingSwimlaneSection', () => {
  it('is true for trending-employees with all PEOPLE items', () => {
    const section: SearchSection = {
      id: 'trending-employees',
      kind: 'TRENDING',
      title: 'Employees',
      presentation: 'LIST',
      items: [personItem('1'), personItem('2')]
    }
    expect(isPeopleTrendingSwimlaneSection(section)).toBe(true)
  })

  it('is false for mixed TRENDING (Explore)', () => {
    const section: SearchSection = {
      id: 'trending-mixed',
      kind: 'TRENDING',
      title: 'Explore',
      presentation: 'LIST',
      items: [
        personItem('1'),
        {
          id: 'w1',
          name: 'Flow',
          type: 'WORKFLOW',
          typeLabel: 'Workflow',
          categoryIds: ['WORKFLOWS'],
          primaryTarget: urlTarget,
          analytics: { provider: 'p', trackingId: 't', rank: 1 }
        }
      ]
    }
    expect(isPeopleTrendingSwimlaneSection(section)).toBe(false)
  })

  it('is false for TRENDING with no items', () => {
    const section: SearchSection = {
      id: 'trending-employees',
      kind: 'TRENDING',
      title: 'Employees',
      presentation: 'LIST',
      items: []
    }
    expect(isPeopleTrendingSwimlaneSection(section)).toBe(false)
  })
})

describe('isHorizontalSwimlaneSection', () => {
  it('is true for RECENT sections', () => {
    const section: SearchSection = {
      id: 'recent-searches',
      kind: 'RECENT',
      title: 'Recent searches',
      presentation: 'LIST',
      items: [personItem('1'), personItem('2')]
    }

    expect(isHorizontalSwimlaneSection(section)).toBe(true)
  })
})
