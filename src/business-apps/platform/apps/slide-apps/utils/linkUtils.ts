/**
 * Link utilities for hyperlink detection, parsing, and sanitization in text elements.
 */

import type { TextLink } from '../components/slideElements'

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

/**
 * Detect URLs in text and return link ranges.
 */
export function detectUrls(text: string): TextLink[] {
  const links: TextLink[] = []
  let match: RegExpExecArray | null

  URL_REGEX.lastIndex = 0
  while ((match = URL_REGEX.exec(text)) !== null) {
    links.push({
      id: `auto-${match.index}-${Date.now()}`,
      start: match.index,
      end: match.index + match[0].length,
      url: match[0],
      isAutoDetected: true
    })
  }

  return links
}

/**
 * Merge auto-detected links with manual links.
 * Manual links take precedence over auto-detected ones.
 */
export function mergeLinks(autoLinks: TextLink[], manualLinks: TextLink[]): TextLink[] {
  const merged: TextLink[] = [...manualLinks]

  for (const autoLink of autoLinks) {
    const overlaps = manualLinks.some(
      manual =>
        (autoLink.start >= manual.start && autoLink.start < manual.end) ||
        (autoLink.end > manual.start && autoLink.end <= manual.end) ||
        (autoLink.start <= manual.start && autoLink.end >= manual.end)
    )

    if (!overlaps) {
      merged.push(autoLink)
    }
  }

  return merged.sort((a, b) => a.start - b.start)
}

/**
 * Sanitize URL for safety. Returns null if URL is invalid or unsafe.
 */
export function sanitizeLinkUrl(url: string): string | null {
  if (!url) return null

  const trimmed = url.trim()
  if (!trimmed) return null

  // Allow mailto: links
  if (trimmed.startsWith('mailto:')) {
    return trimmed
  }

  // Allow http/https URLs
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed
    }
  } catch {
    // Try adding https:// if no protocol
    if (!trimmed.includes('://')) {
      try {
        const withProtocol = `https://${trimmed}`
        const parsed = new URL(withProtocol)
        if (parsed.protocol === 'https:') {
          return withProtocol
        }
      } catch {
        return null
      }
    }
  }

  return null
}

/**
 * Validate if a URL is safe to use.
 */
export function isValidUrl(url: string): boolean {
  return sanitizeLinkUrl(url) !== null
}

export interface TextSegment {
  type: 'text' | 'link'
  content: string
  url?: string
  linkId?: string
}

/**
 * Parse text into segments (plain text and links).
 */
export function parseTextWithLinks(content: string, links: TextLink[]): TextSegment[] {
  if (!content) return []
  if (!links || links.length === 0) {
    return [{ type: 'text', content }]
  }

  const sortedLinks = [...links].sort((a, b) => a.start - b.start)
  const segments: TextSegment[] = []
  let currentIndex = 0

  for (const link of sortedLinks) {
    // Validate link bounds
    if (link.start < 0 || link.end > content.length || link.start >= link.end) {
      continue
    }

    // Add text before this link
    if (link.start > currentIndex) {
      segments.push({
        type: 'text',
        content: content.slice(currentIndex, link.start)
      })
    }

    // Add the link
    segments.push({
      type: 'link',
      content: content.slice(link.start, link.end),
      url: link.url,
      linkId: link.id
    })

    currentIndex = link.end
  }

  // Add remaining text after last link
  if (currentIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.slice(currentIndex)
    })
  }

  return segments
}

/**
 * Adjust link positions after text edit.
 * @param links Current links
 * @param editStart Position where edit started
 * @param deletedLength Number of characters deleted
 * @param insertedLength Number of characters inserted
 */
export function adjustLinksAfterEdit(
  links: TextLink[],
  editStart: number,
  deletedLength: number,
  insertedLength: number
): TextLink[] {
  const delta = insertedLength - deletedLength
  const editEnd = editStart + deletedLength

  return links
    .map(link => {
      // Link is entirely before the edit - no change
      if (link.end <= editStart) {
        return link
      }

      // Link is entirely after the edit - shift by delta
      if (link.start >= editEnd) {
        return {
          ...link,
          start: link.start + delta,
          end: link.end + delta
        }
      }

      // Link overlaps with edit - remove it (manual links should be re-added)
      if (!link.isAutoDetected) {
        return null
      }

      return null
    })
    .filter((link): link is TextLink => link !== null)
}

/**
 * Create a new manual link.
 */
export function createLink(start: number, end: number, url: string): TextLink {
  return {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    start,
    end,
    url,
    isAutoDetected: false
  }
}

/**
 * Remove a link by ID from the links array.
 */
export function removeLink(links: TextLink[], linkId: string): TextLink[] {
  return links.filter(link => link.id !== linkId)
}

/**
 * Update a link's URL.
 */
export function updateLinkUrl(links: TextLink[], linkId: string, newUrl: string): TextLink[] {
  return links.map(link => (link.id === linkId ? { ...link, url: newUrl } : link))
}

/**
 * Find a link at a specific character position.
 */
export function findLinkAtPosition(links: TextLink[], position: number): TextLink | null {
  return links.find(link => position >= link.start && position < link.end) || null
}

/**
 * Open a link in a new tab safely.
 */
export function openLinkInNewTab(url: string): void {
  const sanitized = sanitizeLinkUrl(url)
  if (sanitized) {
    window.open(sanitized, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Find the position where an edit started by comparing old and new text.
 */
export function findEditPosition(oldValue: string, newValue: string): number {
  const minLength = Math.min(oldValue.length, newValue.length)
  for (let i = 0; i < minLength; i++) {
    if (oldValue[i] !== newValue[i]) {
      return i
    }
  }
  return minLength
}
