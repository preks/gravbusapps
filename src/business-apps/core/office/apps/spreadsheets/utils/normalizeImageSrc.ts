/**
 * Normalizes an image "src" value that can be either:
 * - an absolute URL (https://...)
 * - a root-relative URL (/assets/...)
 * - an already-prefixed data URL (data:image/...;base64,...)
 * - a raw base64 string (e.g. `UklGR...` for WebP)
 *
 * Raw base64 values MUST be prefixed, otherwise the browser treats them as a relative URL and
 * attempts to GET `/.../<base64>`, which can trigger server errors (e.g. 431) due to very long URLs.
 */
export function normalizeImageSrc(raw?: string): string | undefined {
  if (!raw) return undefined

  const value = raw.trim()
  if (!value) return undefined

  // Already a full src
  if (
    value.startsWith('data:') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/')
  ) {
    return value
  }

  // Signature-based mime detection for common base64 encodings
  // WebP (RIFF...WEBP) => base64 starts with "UklGR"
  if (value.startsWith('UklGR')) return `data:image/webp;base64,${value}`
  // PNG => base64 starts with "iVBOR"
  if (value.startsWith('iVBOR')) return `data:image/png;base64,${value}`
  // JPEG => base64 starts with "/9j/"
  if (value.startsWith('/9j/')) return `data:image/jpeg;base64,${value}`
  // GIF => base64 starts with "R0lGOD"
  if (value.startsWith('R0lGOD')) return `data:image/gif;base64,${value}`

  // Generic fallback: if it looks like base64, assume JPEG (most common in our app)
  // This avoids giant relative URL requests (e.g. /platform/apps/.../<base64>) that can return 431.
  const base64Only = /^[A-Za-z0-9+/=]+$/
  if (base64Only.test(value) && value.length > 64) {
    return `data:image/jpeg;base64,${value}`
  }

  // Otherwise treat as a (short) relative path and let the browser resolve it.
  return value
}
