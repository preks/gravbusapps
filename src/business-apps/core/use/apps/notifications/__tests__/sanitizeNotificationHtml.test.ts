import { sanitizeNotificationHtml } from '../utils/sanitizeNotificationHtml'

describe('sanitizeNotificationHtml', () => {
  it('returns empty string for undefined input', () => {
    expect(sanitizeNotificationHtml(undefined)).toBe('')
  })

  it('strips script tags', () => {
    const result = sanitizeNotificationHtml('<p>Hi</p><script>alert(1)</script>')
    expect(result).not.toContain('script')
    expect(result).toContain('Hi')
  })
})
