const SAFE_INLINE_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp'
])

const DATA_IMAGE_URL_REGEX = /^data:(image\/(?:png|jpeg|jpg|gif|webp|bmp));base64,([a-z0-9+/=\s]+)$/i

const normalizeSameOriginPath = (url: URL): string => `${url.pathname}${url.search}${url.hash}`

export function isSafeInlineImageMimeType(mimeType: string | null | undefined): boolean {
  return SAFE_INLINE_IMAGE_MIME_TYPES.has((mimeType ?? '').toLowerCase())
}

export function sanitizeInlineImageDataUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.trim().match(DATA_IMAGE_URL_REGEX)
  if (!match) return null

  const mimeType = match[1].toLowerCase()
  const base64Payload = match[2].replace(/\s+/g, '')
  return `data:${mimeType};base64,${base64Payload}`
}

export function sanitizeImageSourceUrl(
  value: string | null | undefined,
  options?: {
    allowRelative?: boolean
    allowBlob?: boolean
    allowData?: boolean
  }
): string {
  if (!value) return ''

  const trimmedValue = value.trim()
  if (!trimmedValue) return ''

  if (options?.allowData) {
    const safeDataUrl = sanitizeInlineImageDataUrl(trimmedValue)
    if (safeDataUrl) return safeDataUrl
  }

  if (options?.allowBlob && trimmedValue.startsWith('blob:')) {
    try {
      const blobUrl = new URL(trimmedValue)
      if (blobUrl.protocol === 'blob:') {
        return `blob:${blobUrl.pathname}${blobUrl.search}${blobUrl.hash}`
      }
    } catch {
      return ''
    }
  }

  try {
    const origin = typeof window === 'undefined' ? 'https://localhost' : window.location.origin
    const parsedUrl = new URL(trimmedValue, origin)
    const isAbsoluteInput = /^[a-z][a-z0-9+.-]*:/i.test(trimmedValue) || trimmedValue.startsWith('//')

    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      if (isAbsoluteInput) {
        return parsedUrl.toString()
      }

      if (options?.allowRelative && parsedUrl.origin === origin) {
        return normalizeSameOriginPath(parsedUrl)
      }
    }
  } catch {
    return ''
  }

  return ''
}

export function sanitizeSameOriginReturnUrl(value: string | null | undefined): string | null {
  if (!value || typeof window === 'undefined') return null

  try {
    const parsedUrl = new URL(value, window.location.origin)
    if (
      (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') ||
      parsedUrl.origin !== window.location.origin
    ) {
      return null
    }

    return normalizeSameOriginPath(parsedUrl)
  } catch {
    return null
  }
}

/**
 * Client-side redirect after API responses that suggest a path. Resolves {@link sanitizeSameOriginReturnUrl}
 * and assigns navigation using only the current origin plus the sanitized path (CWE-601 / open redirect).
 */
export function navigateToSameOriginOrRoot(redirectUrl: string | null | undefined): void {
  if (typeof window === 'undefined') return

  const path = sanitizeSameOriginReturnUrl(redirectUrl) ?? '/'
  const absoluteHref = `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
  window.location.assign(absoluteHref)
}

export function sanitizeDownloadFilename(value: string | null | undefined, fallback = 'download'): string {
  const normalized = (value ?? '')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()

  return normalized || fallback
}

export function createSafeObjectUrl(blob: Blob, isAllowedMimeType: (mimeType: string) => boolean): string | null {
  const mimeType = (blob.type || '').toLowerCase()
  if (!isAllowedMimeType(mimeType)) return null
  return URL.createObjectURL(blob)
}
