import { EditorElement, ColSpan } from '../types'
import { generateElementHtml } from '../templates'

/**
 * Generate a unique ID for editor elements
 * Uses crypto.randomUUID() when available, falls back to monotonic counter + timestamp
 */
let idCounter = 0
const generateUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `element-${crypto.randomUUID()}`
  }
  // Fallback: monotonic counter + timestamp for uniqueness
  return `element-${Date.now()}-${++idCounter}`
}

/**
 * Parse HTML string into EditorElement array using DOMParser for safe parsing
 */
export const parseHtmlToElements = (html: string): EditorElement[] => {
  if (!html.trim()) return []

  // Use DOMParser for safe HTML parsing (avoids XSS via innerHTML)
  const parser = new DOMParser()
  const doc = parser.parseFromString(html.trim(), 'text/html')

  const elements: EditorElement[] = []
  const children = Array.from(doc.body.children)

  if (children.length === 0) {
    // If no children, treat entire content as single paragraph
    return [
      {
        id: generateUniqueId(),
        type: 'paragraph',
        content: `<p>${html.trim()}</p>`
      } as EditorElement
    ]
  }

  children.forEach(child => {
    const tagName = child.tagName.toLowerCase()
    const id = generateUniqueId()
    const content = child.outerHTML || child.textContent || ''

    if (tagName.match(/^h[1-6]$/)) {
      elements.push({
        id,
        type: 'heading',
        content: child.textContent || '',
        config: { level: parseInt(tagName[1]) as 1 | 2 | 3 | 4 | 5 | 6 }
      })
    } else if (tagName === 'ul' || tagName === 'ol') {
      elements.push({
        id,
        type: 'list',
        content: '',
        config: { listType: tagName as 'ul' | 'ol', items: [] }
      })
    } else if (tagName === 'table') {
      elements.push({
        id,
        type: 'table',
        content: '',
        config: {}
      })
    } else if (tagName === 'hr') {
      elements.push({
        id,
        type: 'divider'
      })
    } else if (tagName === 'img') {
      const imgEl = child as HTMLImageElement
      elements.push({
        id,
        type: 'image',
        config: {
          src: imgEl.src || '',
          alt: imgEl.alt,
          width: imgEl.style.width || '100%'
        }
      })
    } else if (tagName === 'a' && child.classList.contains('button')) {
      const aEl = child as HTMLAnchorElement
      elements.push({
        id,
        type: 'button',
        label: child.textContent || 'Button',
        config: { href: aEl.href }
      })
    } else {
      elements.push({
        id,
        type: 'paragraph',
        content
      })
    }
  })

  return elements
}

/**
 * Convert EditorElement array to HTML string
 */
export const elementsToHtml = (elements: EditorElement[]): string => {
  return elements.map(el => generateElementHtml(el)).join('\n')
}

/**
 * Helper to ensure number is valid ColSpan
 */
export const toColSpan = (value: number): ColSpan => {
  const clamped = Math.max(1, Math.min(12, Math.floor(value)))
  return clamped as ColSpan
}
