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

import DOMPurify from 'dompurify'

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

/** Same allowlist as `sanitizeSlideMediaUrl` but without DOMPurify (Node / non-DOM). */
function sanitizeSlideMediaUrlLegacy(trimmed: string, kind: SlideMediaKind): string {
  if (isSafeLocationUrl(trimmed)) return trimmed

  const prefix = kind === 'image' ? 'data:image/' : 'data:video/'
  if (trimmed.startsWith(prefix)) return trimmed

  return ''
}

// Default DOMPurify URI allowlist omits `blob:`; slides use blob URLs for local previews.
const SLIDE_MEDIA_ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|blob|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i

/**
 * CWE-79: run DOMPurify in an img/video `src` attribute context so SAST recognizes
 * a standard sanitizer on the path into React `src` (see DocumentEditor export paths).
 */
function purifyMediaSrcWithDomPurify(trimmed: string, kind: SlideMediaKind): string {
  const tag = kind === 'image' ? 'img' : 'video'
  const el = document.createElement(tag)
  el.setAttribute('src', trimmed)
  const sanitizedHtml = DOMPurify.sanitize(el.outerHTML, {
    ALLOWED_TAGS: [tag],
    ALLOWED_ATTR: ['src'],
    ALLOWED_URI_REGEXP: SLIDE_MEDIA_ALLOWED_URI_REGEXP
  })
  const wrap = document.createElement('div')
  wrap.innerHTML = sanitizedHtml
  const node = wrap.querySelector(tag)
  return node?.getAttribute('src')?.trim() ?? ''
}

export function sanitizeSlideMediaUrl(url: string | undefined, kind: SlideMediaKind): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  // Import-time / Node: no `document` — keep string-only allowlist so PPTX helpers stay usable.
  if (typeof document === 'undefined') {
    return sanitizeSlideMediaUrlLegacy(trimmed, kind)
  }

  const purified = purifyMediaSrcWithDomPurify(trimmed, kind)
  if (!purified) return ''

  if (isSafeLocationUrl(purified)) return purified

  const prefix = kind === 'image' ? 'data:image/' : 'data:video/'
  if (purified.startsWith(prefix)) return purified

  return ''
}

export function sanitizeSlideImageUrl(url: string | undefined): string {
  return sanitizeSlideMediaUrl(url, 'image')
}

export function sanitizeSlideVideoUrl(url: string | undefined): string {
  return sanitizeSlideMediaUrl(url, 'video')
}
