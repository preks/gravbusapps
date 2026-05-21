import { GLOBAL_SEARCH_UI_DEFAULTS, isGlobalSearchDiscoveryMode } from '../utils/globalSearchUiDefaults'

describe('GLOBAL_SEARCH_UI_DEFAULTS', () => {
  it('requires at least three characters before running global search', () => {
    expect(GLOBAL_SEARCH_UI_DEFAULTS.minQueryLength).toBe(3)
  })
})

describe('isGlobalSearchDiscoveryMode', () => {
  it('is true below minQueryLength', () => {
    expect(isGlobalSearchDiscoveryMode('', 3)).toBe(true)
    expect(isGlobalSearchDiscoveryMode('ab', 3)).toBe(true)
  })

  it('is false at or above minQueryLength', () => {
    expect(isGlobalSearchDiscoveryMode('abc', 3)).toBe(false)
  })
})
