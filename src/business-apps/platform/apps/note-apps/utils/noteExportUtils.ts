/**
 * Note Export Utilities
 *
 * Functions for exporting notes to various formats (Markdown, PDF, HTML, TXT)
 */

import type { Note, NoteExportOptions } from '../types'

/** Styles for exported HTML/PDF so `<table>` from the editor renders legibly outside the app shell. */
const EXPORT_DOCUMENT_TABLE_STYLES = `
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        td, th { border: 1px solid #ddd; padding: 0.5em 0.65em; vertical-align: top; }
        th { background: #f5f5f5; font-weight: 600; }
`

function normalizeTableRows(matrix: string[][]): string[][] {
  if (matrix.length === 0) {
    return []
  }
  const colCount = Math.max(...matrix.map(r => r.length))
  return matrix.map(row => {
    const next = [...row]
    while (next.length < colCount) {
      next.push('')
    }
    return next.slice(0, colCount)
  })
}

function escapeMarkdownTableCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()
}

function htmlTableHtmlToPlain(tableHtml: string): string {
  if (typeof DOMParser === 'undefined') {
    return tableHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const doc = new DOMParser().parseFromString(tableHtml, 'text/html')
  const table = doc.querySelector('table')
  if (!table) {
    return ''
  }

  const rows = Array.from(table.querySelectorAll('tr'))
  return rows
    .map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'))
      return cells.map(c => (c.textContent || '').replace(/\s+/g, ' ').trim()).join('\t')
    })
    .join('\n')
}

function htmlTableHtmlToGfmMarkdown(tableHtml: string): string {
  if (typeof DOMParser === 'undefined') {
    return ''
  }

  const doc = new DOMParser().parseFromString(tableHtml, 'text/html')
  const table = doc.querySelector('table')
  if (!table) {
    return ''
  }

  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length === 0) {
    return ''
  }

  const matrix = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('th, td'))
    return cells.map(c => escapeMarkdownTableCell(c.textContent || ''))
  })

  const normalized = normalizeTableRows(matrix)
  const header = normalized[0]
  const sep = header.map(() => '---')
  const bodyRows = normalized.slice(1)

  const lines = [
    '| ' + header.join(' | ') + ' |',
    '| ' + sep.join(' | ') + ' |',
    ...bodyRows.map(row => '| ' + row.join(' | ') + ' |')
  ]

  return '\n\n' + lines.join('\n') + '\n\n'
}

/**
 * Convert HTML content to Markdown
 */
export function htmlToMarkdown(html: string): string {
  let markdown = html

  // Tables → GFM (must run before conversions that match `<p>` inside cells)
  markdown = markdown.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, match => htmlTableHtmlToGfmMarkdown(match))

  // Replace headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')

  // Replace bold
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')

  // Replace italic
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

  // Replace underline (no direct markdown equiv, use HTML)
  markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')

  // Replace strikethrough
  markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
  markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
  markdown = markdown.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~')

  // Replace code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')

  // Replace pre/code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
  markdown = markdown.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n')

  // Replace blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    const lines = content.trim().split('\n')
    return lines.map((line: string) => `> ${line.replace(/<[^>]*>/g, '').trim()}`).join('\n') + '\n\n'
  })

  // Replace unordered lists
  markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    return (
      content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m: string, item: string) => {
        return `- ${item.replace(/<[^>]*>/g, '').trim()}\n`
      }) + '\n'
    )
  })

  // Replace ordered lists
  let listCounter = 0
  markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    listCounter = 0
    return (
      content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m: string, item: string) => {
        listCounter++
        return `${listCounter}. ${item.replace(/<[^>]*>/g, '').trim()}\n`
      }) + '\n'
    )
  })

  // Replace task lists
  markdown = markdown.replace(
    /<li[^>]*data-type="taskItem"[^>]*data-checked="true"[^>]*>([\s\S]*?)<\/li>/gi,
    '- [x] $1\n'
  )
  markdown = markdown.replace(
    /<li[^>]*data-type="taskItem"[^>]*data-checked="false"[^>]*>([\s\S]*?)<\/li>/gi,
    '- [ ] $1\n'
  )

  // Replace links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

  // Replace images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')

  // Replace horizontal rules
  markdown = markdown.replace(/<hr[^>]*\/?>/gi, '\n---\n')

  // Replace paragraphs
  markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')

  // Replace line breaks
  markdown = markdown.replace(/<br[^>]*\/?>/gi, '\n')

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  markdown = markdown.replace(/&nbsp;/g, ' ')
  markdown = markdown.replace(/&amp;/g, '&')
  markdown = markdown.replace(/&lt;/g, '<')
  markdown = markdown.replace(/&gt;/g, '>')
  markdown = markdown.replace(/&quot;/g, '"')
  markdown = markdown.replace(/&#39;/g, "'")

  // Clean up multiple newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n')

  return markdown.trim()
}

/**
 * Convert HTML content to plain text
 */
export function htmlToPlainText(html: string): string {
  // Remove tags but keep structure
  let text = html

  text = text.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, match => `\n${htmlTableHtmlToPlain(match)}\n`)

  // Add newlines for block elements
  text = text.replace(/<\/?(h[1-6]|p|div|br|li|ul|ol|blockquote|pre)[^>]*>/gi, '\n')

  // Add extra newline for headings
  text = text.replace(/<h[1-6][^>]*>/gi, '\n\n')

  // Remove all other tags
  text = text.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Clean up whitespace (preserve tab characters used for exported table columns)
  text = text.replace(/ +/g, ' ')
  text = text.replace(/\n +/g, '\n')
  text = text.replace(/ +\n/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

const DEFAULT_UNTITLED = 'Untitled'
const DEFAULT_UNTITLED_FILENAME = 'untitled'

/**
 * Generate metadata header for export
 */
function generateMetadataHeader(note: Note, labelUntitled?: string): string {
  const untitled = labelUntitled ?? DEFAULT_UNTITLED
  const lines = [
    '---',
    `title: ${note.title || untitled}`,
    `created: ${new Date(note.createdAt).toISOString()}`,
    `updated: ${new Date(note.updatedAt).toISOString()}`
  ]

  if (note.tags && note.tags.length > 0) {
    lines.push(`tags: [${note.tags.join(', ')}]`)
  }

  if (note.color && note.color !== 'default') {
    lines.push(`color: ${note.color}`)
  }

  if (note.icon) {
    lines.push(`icon: ${note.icon}`)
  }

  lines.push('---', '')

  return lines.join('\n')
}

/**
 * Export note to specified format
 */
export function exportNote(note: Note, options: NoteExportOptions): string {
  const { format, includeMetadata = false, labelUntitled } = options
  const content = note.content || ''
  const untitled = labelUntitled ?? DEFAULT_UNTITLED

  let output = ''

  // Add metadata if requested
  if (includeMetadata && format !== 'html') {
    output += generateMetadataHeader(note, untitled)
  }

  switch (format) {
    case 'markdown':
      output += `# ${note.title || untitled}\n\n`
      output += htmlToMarkdown(content)
      break

    case 'html':
      if (includeMetadata) {
        output = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${note.title || untitled}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
        }
        h1, h2, h3 { margin-top: 1.5em; }
        code { background: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px; }
        pre { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding-left: 1em; color: #666; }
        img { max-width: 100%; }
        ${EXPORT_DOCUMENT_TABLE_STYLES}
    </style>
</head>
<body>
    <h1>${note.title || untitled}</h1>
    ${content}
</body>
</html>`
      } else {
        output = content
      }
      break

    case 'txt':
      const txtTitle = note.title || untitled
      output += `${txtTitle}\n${'='.repeat(txtTitle.length)}\n\n`
      output += htmlToPlainText(content)
      break

    case 'pdf':
      // PDF export would typically be handled differently (using a library like jsPDF)
      // For now, return HTML that can be printed to PDF
      output = `<!DOCTYPE html>
<html>
<head>
    <title>${note.title || untitled}</title>
    <style>
        @page { margin: 2cm; }
        body {
            font-family: Georgia, serif;
            font-size: 12pt;
            line-height: 1.6;
        }
        h1 { font-size: 24pt; }
        h2 { font-size: 18pt; }
        h3 { font-size: 14pt; }
        ${EXPORT_DOCUMENT_TABLE_STYLES}
    </style>
</head>
<body>
    <h1>${note.title || untitled}</h1>
    ${content}
</body>
</html>`
      break
  }

  return output
}

/**
 * Download note as file
 */
export function downloadNote(note: Note, options: NoteExportOptions): void {
  const content = exportNote(note, options)
  const filenameUntitled = options.filenameUntitled ?? DEFAULT_UNTITLED_FILENAME
  const filename = `${(note.title || filenameUntitled).replace(/[^a-z0-9]/gi, '_').toLowerCase()}`

  let mimeType: string
  let extension: string

  switch (options.format) {
    case 'markdown':
      mimeType = 'text/markdown'
      extension = 'md'
      break
    case 'html':
      mimeType = 'text/html'
      extension = 'html'
      break
    case 'txt':
      mimeType = 'text/plain'
      extension = 'txt'
      break
    case 'pdf':
      // For PDF, we'd typically use a different approach
      // This creates an HTML file that can be printed to PDF
      mimeType = 'text/html'
      extension = 'html'
      break
    default:
      mimeType = 'text/plain'
      extension = 'txt'
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Copy note content to clipboard
 */
export async function copyNoteToClipboard(note: Note, format: 'markdown' | 'plain'): Promise<void> {
  const content = note.content || ''

  let text: string
  if (format === 'markdown') {
    text = htmlToMarkdown(content)
  } else {
    text = htmlToPlainText(content)
  }

  await navigator.clipboard.writeText(text)
}
