import { normalizeWhiteboardLink } from './normalizeWhiteboardLink'

describe('normalizeWhiteboardLink', () => {
  it('prepends https to bare domains', () => {
    expect(normalizeWhiteboardLink('google.com')).toBe('https://google.com')
    expect(normalizeWhiteboardLink('www.google.com/search?q=whiteboard')).toBe(
      'https://www.google.com/search?q=whiteboard'
    )
  })

  it('keeps explicit schemes unchanged', () => {
    expect(normalizeWhiteboardLink('https://google.com')).toBe('https://google.com')
    expect(normalizeWhiteboardLink('mailto:test@example.com')).toBe('mailto:test@example.com')
  })

  it('keeps internal app paths unchanged', () => {
    expect(normalizeWhiteboardLink('/platform/every-office/whiteboards?whiteboardId=123')).toBe(
      '/platform/every-office/whiteboards?whiteboardId=123'
    )
  })

  it('returns null for empty values', () => {
    expect(normalizeWhiteboardLink('')).toBeNull()
    expect(normalizeWhiteboardLink('   ')).toBeNull()
    expect(normalizeWhiteboardLink(undefined)).toBeNull()
  })
})
