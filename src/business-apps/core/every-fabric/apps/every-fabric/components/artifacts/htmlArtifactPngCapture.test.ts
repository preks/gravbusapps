import {
  blobFromValidatedPngDataUrl,
  sanitizeArtifactHtmlForCapture,
  sanitizeArtifactPngFileName
} from './htmlArtifactPngCapture'

describe('sanitizeArtifactPngFileName', () => {
  it('replaces unsafe characters and html extension', () => {
    expect(sanitizeArtifactPngFileName('../evil/report.html')).toBe('.._evil_report.png')
  })

  it('falls back to artifact when name is empty after sanitization', () => {
    expect(sanitizeArtifactPngFileName('   ')).toBe('artifact.png')
  })
})

describe('blobFromValidatedPngDataUrl', () => {
  it('accepts a valid png data url', () => {
    const blob = blobFromValidatedPngDataUrl('data:image/png;base64,iVBORw0KGgo=')
    expect(blob).not.toBeNull()
    expect(blob?.type).toBe('image/png')
  })

  it('rejects javascript payloads disguised as data urls', () => {
    expect(blobFromValidatedPngDataUrl('javascript:alert(1)')).toBeNull()
    expect(blobFromValidatedPngDataUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull()
  })
})

describe('sanitizeArtifactHtmlForCapture', () => {
  it('strips script tags from remote html', () => {
    const safe = sanitizeArtifactHtmlForCapture('<html><body><script>alert(1)</script><p>ok</p></body></html>')
    expect(safe).not.toContain('<script')
    expect(safe).toContain('ok')
  })

  it('wraps sanitized body in a minimal document shell', () => {
    const safe = sanitizeArtifactHtmlForCapture('<p>chart</p>')
    expect(safe).toContain('<!doctype html>')
    expect(safe).toContain('<meta charset="utf-8">')
    expect(safe).toContain('<p>chart</p>')
  })
})
