import { GLOBAL_SEARCH_UI_DEFAULTS } from '../utils/globalSearchUiDefaults'

describe('GLOBAL_SEARCH_UI_DEFAULTS', () => {
  it('requires at least three characters before running global search', () => {
    expect(GLOBAL_SEARCH_UI_DEFAULTS.minQueryLength).toBe(3)
  })
})
