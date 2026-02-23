function splitPipeRowCells(row: string): string[] {
  const trimmed = row.trim()
  const withoutEdges = trimmed.replace(/^\|/, '').replace(/\|$/, '')
  return withoutEdges
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function isSeparatorCell(cell: string): boolean {
  // GFM allows :---, ---:, :---: and requires at least 3 dashes
  return /^:?-{3,}:?$/.test(cell.trim())
}

function formatPipeRow(cells: string[]): string {
  return `| ${cells.map(c => c.trim()).join(' | ')} |`
}

function normalizeFlattenedTableLine(line: string): string {
  // A "flattened" table is usually a single line containing:
  // - a header row with pipes
  // - a separator row ("| --- | --- |") also on the same line
  // - multiple data rows also on the same line
  //
  // Example (broken):
  // | A | B | | --- | --- | | 1 | 2 | | 3 | 4 |
  if (!line.includes('|') || !line.includes('---')) return line

  // Find the first occurrence of a separator-row run like: | --- | --- |
  // Require at least 2 columns to reduce false positives.
  const sepRegex = /\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*){1,}\|/
  const match = sepRegex.exec(line)
  if (!match || match.index === undefined) return line

  const headerPart = line.slice(0, match.index).trim()
  const restPart = line.slice(match.index).trim()

  const headerCells = splitPipeRowCells(headerPart)
  if (headerCells.length < 2) return line
  const colCount = headerCells.length

  const rawCells = restPart.split('|').map(s => s.trim())
  let i = 0
  if (rawCells[i] === '') i += 1

  const sepCells = rawCells.slice(i, i + colCount)
  if (sepCells.length !== colCount || !sepCells.every(isSeparatorCell)) return line
  i += colCount

  // Skip the empty token that can appear between rows as "| |"
  if (rawCells[i] === '') i += 1

  const rows: string[][] = []
  while (i < rawCells.length) {
    // Flattened tables often have an extra empty token at row boundaries ("| |").
    if (rawCells[i] === '' && rawCells.length - i >= colCount + 1) {
      i += 1
    }

    const row = rawCells.slice(i, i + colCount)
    if (row.length < colCount) break
    rows.push(row)
    i += colCount

    if (rawCells[i] === '') i += 1
  }

  // Recreate the separator row with the same column count (keep the detected cells as-is).
  const normalizedSep = formatPipeRow(sepCells.map(() => '---'))

  return [formatPipeRow(headerCells), normalizedSep, ...rows.map(formatPipeRow)].join('\n')
}

function normalizeTables(markdown: string): string {
  const lines = markdown.split('\n')
  let inFence = false

  const out: string[] = []
  for (const line of lines) {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('```')) {
      inFence = !inFence
      out.push(line)
      continue
    }

    out.push(inFence ? line : normalizeFlattenedTableLine(line))
  }
  return out.join('\n')
}

function stripEmptyHtmlAnchors(markdown: string): string {
  // ReactMarkdown doesn't render raw HTML (no rehypeRaw), so these show up as literal text.
  // Remove empty anchor tags used for TOC targets, e.g.:
  // <a name="case-studies"></a>
  // <a name="case-studies">
  // </a>
  return markdown.replace(/<a\s+name="[^"]+"\s*\/>/gi, '').replace(/<a\s+name="[^"]+"\s*>\s*<\/a>/gi, '')
}

export function normalizeNexusMarkdown(markdown: string): string {
  if (!markdown) return markdown
  const withoutAnchors = stripEmptyHtmlAnchors(markdown)
  return normalizeTables(withoutAnchors)
}
