/**
 * Translation Utilities
 * Helper functions for text extraction and translation mapping
 */

/**
 * Extracts plain text from HTML string for translation
 * Uses DOMParser for safe parsing (avoids ReDoS vulnerabilities)
 */
export const extractTextFromHTML = (html: string): string => {
  if (!html) return ''

  try {
    // Use DOMParser for safe HTML parsing (avoids XSS and ReDoS)
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return (doc.body.textContent || doc.body.innerText || '').trim()
  } catch (error) {
    // Fallback: if DOMParser fails, return empty string
    console.warn('Failed to parse HTML:', error)
    return ''
  }
}

/**
 * Collects all translatable texts from a ContentEntry
 */
export const collectAllTexts = (contentEntry: {
  title?: string | null
  preview?: string | null
  content?: string | null
}): string[] => {
  const texts: string[] = []

  if (contentEntry.title) {
    texts.push(contentEntry.title)
  }

  if (contentEntry.preview) {
    texts.push(contentEntry.preview)
  }

  if (contentEntry.content) {
    // Extract text from HTML content
    const plainText = extractTextFromHTML(contentEntry.content)
    if (plainText.trim()) {
      texts.push(plainText)
    }
  }

  return texts.filter(text => text.trim().length > 0)
}

/**
 * Maps translation results back to content structure
 */
export const mapTranslationsToContent = (translations: string[], originalTexts: string[]): Record<string, string> => {
  const mapped: Record<string, string> = {}

  originalTexts.forEach((original, index) => {
    if (translations[index]) {
      mapped[original] = translations[index]
    }
  })

  return mapped
}

/**
 * Maps translations to ContentEntry fields
 */
export const mapTranslationsToContentEntry = (
  translations: string[],
  contentEntry: {
    title?: string | null
    preview?: string | null
    content?: string | null
  }
): {
  title?: string
  preview?: string
  content?: string
} => {
  const result: {
    title?: string
    preview?: string
    content?: string
  } = {}

  let translationIndex = 0

  if (contentEntry.title && translations[translationIndex]) {
    result.title = translations[translationIndex]
    translationIndex++
  }

  if (contentEntry.preview && translations[translationIndex]) {
    result.preview = translations[translationIndex]
    translationIndex++
  }

  if (contentEntry.content && translations[translationIndex]) {
    // For HTML content, we need to replace the text content while preserving HTML structure
    // This is a simplified approach - in production, you might want more sophisticated HTML handling
    const originalText = extractTextFromHTML(contentEntry.content)
    if (originalText.trim() && translations[translationIndex]) {
      // Replace the text content in HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = contentEntry.content
      tempDiv.textContent = translations[translationIndex]
      result.content = tempDiv.innerHTML
    }
  }

  return result
}
