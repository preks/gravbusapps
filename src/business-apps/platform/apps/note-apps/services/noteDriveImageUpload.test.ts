import { describe, expect, it } from 'vitest'
import {
  buildDriveImageDownloadUrl,
  extractDriveFileIdFromImageSrc,
  isNoteDriveImageProtectedSrc,
  validateNoteImageFile
} from './noteDriveImageUpload'

describe('noteDriveImageUpload', () => {
  it('buildDriveImageDownloadUrl strips trailing slash on base', () => {
    expect(buildDriveImageDownloadUrl('file-1', 'https://doc.example.com/api/v1/')).toBe(
      'https://doc.example.com/api/v1/drive/files/file-1/download'
    )
  })

  it('extractDriveFileIdFromImageSrc parses absolute and relative URLs', () => {
    expect(extractDriveFileIdFromImageSrc('https://doc.example.com/api/v1/drive/files/abc-123/download')).toBe(
      'abc-123'
    )
    expect(extractDriveFileIdFromImageSrc('/api/v1/drive/files/xyz/download')).toBe('xyz')
  })

  it('isNoteDriveImageProtectedSrc ignores data URLs', () => {
    expect(isNoteDriveImageProtectedSrc('data:image/png;base64,xxx')).toBe(false)
    expect(isNoteDriveImageProtectedSrc('https://x/drive/files/id/download')).toBe(true)
  })

  it('validateNoteImageFile rejects non-images', () => {
    const bad = new File(['x'], 'readme.txt', { type: 'text/plain' })
    expect(validateNoteImageFile(bad).ok).toBe(false)
    const good = new File(['x'], 'pic.png', { type: 'image/png' })
    expect(validateNoteImageFile(good).ok).toBe(true)
  })

  it('validateNoteImageFile rejects SVG', () => {
    const svg = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' })
    expect(validateNoteImageFile(svg).ok).toBe(false)
  })
})
