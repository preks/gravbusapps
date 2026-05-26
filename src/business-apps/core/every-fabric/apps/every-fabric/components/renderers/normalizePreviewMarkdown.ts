/** Line starts with a bold label, e.g. `**Employee:**` or `**Last working day:** 2026-07-30`. */
const FIELD_LINE = /^\s*\*\*[^:]+:\*\*/

/** Markdown list item (`-`, `*`, `•`, or `1.`). */
const LIST_LINE = /^\s*(?:[-•*]|\d+\.)\s/

/**
 * Agent-authored HITL preview markdown often uses single `\n` between
 * labeled rows. Standard markdown collapses those into one paragraph, so
 * "Last working day" and "Assigned company assets" run together. Insert
 * blank lines before each new field or list block while keeping consecutive
 * list items on single newlines so GFM lists still parse.
 */
export function normalizePreviewMarkdown(markdown: string): string {
  if (!markdown?.trim()) return markdown

  const lines = markdown.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const prevTrimmed = i > 0 ? lines[i - 1].trim() : ''

    if (i > 0 && trimmed && prevTrimmed) {
      const isField = FIELD_LINE.test(trimmed)
      const isList = LIST_LINE.test(trimmed)
      const prevIsList = LIST_LINE.test(prevTrimmed)

      if (isField || (isList && !prevIsList)) {
        result.push('')
      }
    }

    result.push(LIST_LINE.test(trimmed) ? line.replace(/^\s*•\s+/, '- ') : line)
  }

  return result.join('\n')
}
