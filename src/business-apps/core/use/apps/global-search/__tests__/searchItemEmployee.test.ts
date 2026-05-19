import type { SearchItem } from '../types'
import { isSearchItemEmployeeHit } from '../utils'

const base: Pick<SearchItem, 'id' | 'name' | 'categoryIds' | 'primaryTarget' | 'analytics'> = {
  id: 'e1',
  name: 'Alex',
  categoryIds: ['PEOPLE'],
  primaryTarget: { kind: 'URL', href: '/' },
  analytics: { provider: 'p', trackingId: 't', rank: 1 }
}

describe('isSearchItemEmployeeHit', () => {
  it('returns true for EMPLOYEE entity type', () => {
    const item: SearchItem = { ...base, type: 'EMPLOYEE', typeLabel: 'Employee' }
    expect(isSearchItemEmployeeHit(item)).toBe(true)
  })

  it('returns true when typeLabel is Employee', () => {
    const item: SearchItem = { ...base, type: 'UNKNOWN', typeLabel: 'Employee' }
    expect(isSearchItemEmployeeHit(item)).toBe(true)
  })

  it('returns false for job candidate', () => {
    const item: SearchItem = { ...base, type: 'JOB_CANDIDATE', typeLabel: 'Job Candidate' }
    expect(isSearchItemEmployeeHit(item)).toBe(false)
  })
})
