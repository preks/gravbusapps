import { globalSearchFetchErrorMessage } from '../utils/globalSearchFetchErrorMessage'

describe('globalSearchFetchErrorMessage', () => {
  it('maps Failed to fetch to a helpful message', () => {
    expect(globalSearchFetchErrorMessage(new Error('Failed to fetch'), 'fallback')).toContain('search API')
  })

  it('passes through other errors', () => {
    expect(globalSearchFetchErrorMessage(new Error('REST request failed: 401'), 'fallback')).toBe(
      'REST request failed: 401'
    )
  })

  it('uses fallback for non-Error', () => {
    expect(globalSearchFetchErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
