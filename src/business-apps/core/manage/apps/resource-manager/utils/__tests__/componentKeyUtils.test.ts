import { normalizeSystemScreenKeySuffix } from '../componentKeyUtils'

describe('normalizeSystemScreenKeySuffix', () => {
  it('preserves hyphens in system key suffix', () => {
    expect(normalizeSystemScreenKeySuffix('user-menu')).toBe('user-menu')
  })

  it('preserves underscores in system key suffix', () => {
    expect(normalizeSystemScreenKeySuffix('notifications')).toBe('notifications')
    expect(normalizeSystemScreenKeySuffix('global_search')).toBe('global_search')
  })

  it('collapses spaces to hyphen', () => {
    expect(normalizeSystemScreenKeySuffix('global search')).toBe('global-search')
  })

  it('trims leading and trailing separators', () => {
    expect(normalizeSystemScreenKeySuffix('---user-menu---')).toBe('user-menu')
    expect(normalizeSystemScreenKeySuffix('__global_search__')).toBe('global_search')
  })
})
