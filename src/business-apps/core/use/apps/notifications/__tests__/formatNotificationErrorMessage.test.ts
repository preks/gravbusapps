import { formatNotificationErrorMessage } from '../utils/formatNotificationErrorMessage'

describe('formatNotificationErrorMessage', () => {
  it('returns fallback for non-Error values', () => {
    expect(formatNotificationErrorMessage(null, 'Fallback')).toBe('Fallback')
  })

  it('strips REST status prefix from Error messages', () => {
    const error = new Error('REST request failed: 503 - Service unavailable')
    expect(formatNotificationErrorMessage(error, 'Fallback')).toBe('Service unavailable')
  })

  it('returns fallback when message is empty after stripping', () => {
    const error = new Error('REST request failed: 500 - ')
    expect(formatNotificationErrorMessage(error, 'Fallback')).toBe('Fallback')
  })
})
