/**
 * Text utility functions
 */

/**
 * Fix UTF-8 encoding issues where characters like "ü" appear as "Ã¼"
 * This happens when UTF-8 encoded bytes are interpreted as Latin-1/ISO-8859-1
 */
export function fixUtf8Encoding(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return text || ''

  // Check if the string contains common mojibake patterns
  // If it does, try to fix it by treating Latin-1 bytes as UTF-8
  if (/Ã[^\s]/.test(text)) {
    try {
      // Convert string to Latin-1 byte array, then decode as UTF-8
      const bytes = new Uint8Array(text.length)
      for (let i = 0; i < text.length; i++) {
        bytes[i] = text.charCodeAt(i)
      }
      // Decode bytes as UTF-8
      const decoder = new TextDecoder('utf-8')
      const fixed = decoder.decode(bytes)
      return fixed
    } catch {
      // If decoding fails, return original
      return text
    }
  }

  return text
}

/**
 * Sanitize text for display
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return ''
  return String(text).trim()
}
