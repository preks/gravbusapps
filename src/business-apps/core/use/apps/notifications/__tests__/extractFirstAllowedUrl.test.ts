import { extractFirstAllowedUrl } from '../utils/extractFirstAllowedUrl'

describe('extractFirstAllowedUrl', () => {
  it('returns null for empty input', () => {
    expect(extractFirstAllowedUrl(undefined)).toBeNull()
  })

  it('returns same-origin link', () => {
    const html = `<a href="${globalThis.window.location.origin}/platform/home">Home</a>`
    const url = extractFirstAllowedUrl(html)
    expect(url).toContain('/platform/home')
  })
})
