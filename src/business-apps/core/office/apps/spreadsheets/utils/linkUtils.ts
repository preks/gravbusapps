/**
 * Utility functions for handling links in spreadsheet cells
 */

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(text: string): boolean {
  if (!text || typeof text !== 'string') return false

  // Trim whitespace
  const trimmed = text.trim()

  // Check for common URL patterns
  try {
    const url = new URL(trimmed)
    // Must be http or https
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    // Not a valid URL
    return false
  }
}

/**
 * Parse a markdown link string into title and URL
 * Format: [title](url)
 */
export function parseMarkdownLink(markdown: string): { title: string; url: string } | null {
  if (!markdown || typeof markdown !== 'string') return null

  const trimmed = markdown.trim()

  // Match markdown link pattern: [title](url)
  const match = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
  if (match) {
    return {
      title: match[1],
      url: match[2]
    }
  }

  // If it's just a URL, return it with URL as title
  if (isValidUrl(trimmed)) {
    return {
      title: trimmed,
      url: trimmed
    }
  }

  return null
}

/**
 * Convert a URL to markdown link format
 * If title is not provided, uses the URL as the title
 */
export function urlToMarkdown(url: string, title?: string): string {
  if (!url || typeof url !== 'string') return ''

  const trimmedUrl = url.trim()
  const trimmedTitle = title?.trim() || trimmedUrl

  return `[${trimmedTitle}](${trimmedUrl})`
}

/**
 * Check if a string is a markdown link
 */
export function isMarkdownLink(text: string): boolean {
  if (!text || typeof text !== 'string') return false

  const trimmed = text.trim()
  return /^\[([^\]]+)\]\(([^)]+)\)$/.test(trimmed)
}

/**
 * Extract URL from markdown link or return the string if it's already a URL
 */
export function extractUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null

  const trimmed = text.trim()

  // Try to parse as markdown link
  const parsed = parseMarkdownLink(trimmed)
  if (parsed) {
    return parsed.url
  }

  // Check if it's a valid URL
  if (isValidUrl(trimmed)) {
    return trimmed
  }

  return null
}

/**
 * Get display text for a link (title if markdown, URL if plain URL)
 */
export function getLinkDisplayText(text: string): string {
  if (!text || typeof text !== 'string') return text

  const parsed = parseMarkdownLink(text)
  if (parsed) {
    return parsed.title
  }

  if (isValidUrl(text)) {
    return text
  }

  return text
}
