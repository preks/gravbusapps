import { computeHasMore, NOTIFICATIONS_PAGE_SIZE } from '../utils/computeHasMore'

describe('computeHasMore', () => {
  it('returns false when the page is not full', () => {
    expect(computeHasMore(0, 3, 100, 0, false)).toBe(false)
  })

  it('returns false when the last full page reaches total', () => {
    expect(computeHasMore(9, NOTIFICATIONS_PAGE_SIZE, 100, 0, false)).toBe(false)
  })

  it('returns true when more items remain', () => {
    expect(computeHasMore(0, NOTIFICATIONS_PAGE_SIZE, 100, 0, false)).toBe(true)
  })

  it('uses unread total when filtering unread only', () => {
    expect(computeHasMore(0, NOTIFICATIONS_PAGE_SIZE, 5000, 15, true)).toBe(true)
    expect(computeHasMore(1, NOTIFICATIONS_PAGE_SIZE, 5000, 15, true)).toBe(false)
  })
})
