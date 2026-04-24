// Shared sanitizer for slide media URLs. Importer, thumbnails, canvas,
// presenter and export renderer must agree on the exact same acceptance
// rules so an imported image that looks fine in one place cannot go blank
// in another.
//
// Accepted shapes:
//   - https://... and http://...
//   - blob:...
//   - same-origin relative paths (`/foo`, `./foo`)
//   - `data:image/<type>;base64,<payload>` (for image usage)
//   - `data:video/<type>;...` (for video usage)
//
// Specifically rejected: `data:application/octet-stream;...`, `javascript:`,
// and any other scheme not explicitly allowed. The octet-stream rejection is
// important because the PPTX importer historically produced those URLs for
// images with unknown file extensions, which then silently failed to render.

export type SlideMediaKind = 'image' | 'video'

function isSafeLocationUrl(trimmed: string): boolean {
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  )
}

export function sanitizeSlideMediaUrl(url: string | undefined, kind: SlideMediaKind): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  if (isSafeLocationUrl(trimmed)) return trimmed

  const prefix = kind === 'image' ? 'data:image/' : 'data:video/'
  if (trimmed.startsWith(prefix)) return trimmed

  return ''
}

export function sanitizeSlideImageUrl(url: string | undefined): string {
  return sanitizeSlideMediaUrl(url, 'image')
}

export function sanitizeSlideVideoUrl(url: string | undefined): string {
  return sanitizeSlideMediaUrl(url, 'video')
}
