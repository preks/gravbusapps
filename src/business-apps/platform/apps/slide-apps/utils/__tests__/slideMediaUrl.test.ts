import { sanitizeSlideImageUrl, sanitizeSlideVideoUrl, sanitizeSlideMediaUrl } from '../slideMediaUrl'

describe('sanitizeSlideMediaUrl', () => {
  it('accepts absolute https and http URLs for both images and videos', () => {
    expect(sanitizeSlideImageUrl('https://cdn.example.com/logo.png')).toBe('https://cdn.example.com/logo.png')
    expect(sanitizeSlideVideoUrl('http://example.com/clip.mp4')).toBe('http://example.com/clip.mp4')
  })

  it('accepts blob and relative URLs', () => {
    expect(sanitizeSlideImageUrl('blob:nw:1234')).toBe('blob:nw:1234')
    expect(sanitizeSlideImageUrl('/uploads/brand.png')).toBe('/uploads/brand.png')
    expect(sanitizeSlideImageUrl('./relative.png')).toBe('./relative.png')
  })

  it('accepts data:image/<type> for image kind and data:video/<type> for video kind', () => {
    expect(sanitizeSlideImageUrl('data:image/png;base64,ZZZ')).toBe('data:image/png;base64,ZZZ')
    expect(sanitizeSlideVideoUrl('data:video/mp4;base64,ZZZ')).toBe('data:video/mp4;base64,ZZZ')
  })

  it('rejects data:application/octet-stream to guard against the legacy PPTX import fallback', () => {
    // Regression: the PPTX importer used to emit this MIME when the source
    // file had an unknown extension. The canvas sanitizer dropped such URLs,
    // which surfaced as "imported images are blank".
    expect(sanitizeSlideImageUrl('data:application/octet-stream;base64,ZZZ')).toBe('')
  })

  it('rejects mismatched data kinds', () => {
    expect(sanitizeSlideImageUrl('data:video/mp4;base64,ZZZ')).toBe('')
    expect(sanitizeSlideVideoUrl('data:image/png;base64,ZZZ')).toBe('')
  })

  it('rejects dangerous schemes', () => {
    expect(sanitizeSlideImageUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeSlideImageUrl('file:///etc/passwd')).toBe('')
    expect(sanitizeSlideVideoUrl('javascript:alert(1)')).toBe('')
  })

  it('treats empty / whitespace input as rejected', () => {
    expect(sanitizeSlideImageUrl(undefined)).toBe('')
    expect(sanitizeSlideImageUrl('')).toBe('')
    expect(sanitizeSlideImageUrl('   ')).toBe('')
  })

  it('sanitizeSlideMediaUrl supports explicit kind selection', () => {
    expect(sanitizeSlideMediaUrl('data:image/png;base64,AAA', 'image')).toBe('data:image/png;base64,AAA')
    expect(sanitizeSlideMediaUrl('data:image/png;base64,AAA', 'video')).toBe('')
  })
})
