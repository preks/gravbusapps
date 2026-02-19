/**
 * SearchResultItem - beautiful, column-aware search result row.
 * Renders actual field values (not raw JSON) with match highlighting.
 * Used by both BoardSearchDialog (single-board) and GlobalSearchDialog (cross-board).
 */

import React, { useMemo } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { LayoutGrid, FileText } from 'lucide-react'
import type { BoardColumn } from '../../types'
import type { SearchResult } from '../../hooks/useBoardSearch'

export interface SearchResultItemProps {
  result: SearchResult
  query: string
  columns?: BoardColumn[]
  showBoardName?: boolean
  onClick: () => void
  'data-testid'?: string
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  query,
  columns,
  showBoardName,
  onClick,
  'data-testid': testId
}) => {
  const { title, fields } = useMemo(() => {
    const data = result.data || {}
    const cols = columns || []
    const primary = cols.find(c => c.isPrimary) || cols[0]
    const titleValue = primary ? String(data[primary.name] || '') : firstTextValue(data)

    const matchingFields: Array<{ label: string; value: string }> = []
    const lowerQ = query.toLowerCase()

    for (const col of cols) {
      if (col === primary) continue
      const raw = data[col.name]
      if (raw === null || raw === undefined || raw === '') continue
      const str = formatValue(raw, col.type)
      if (str.toLowerCase().includes(lowerQ) || titleValue.toLowerCase().includes(lowerQ)) {
        matchingFields.push({ label: col.label, value: str })
      }
      if (matchingFields.length >= 3) break
    }

    if (matchingFields.length === 0 && cols.length > 0) {
      for (const col of cols.slice(0, 3)) {
        if (col === primary) continue
        const raw = data[col.name]
        if (raw === null || raw === undefined || raw === '') continue
        matchingFields.push({ label: col.label, value: formatValue(raw, col.type) })
      }
    }

    if (matchingFields.length === 0 && Object.keys(data).length > 0) {
      for (const [key, val] of Object.entries(data)) {
        if (val === null || val === undefined || val === '') continue
        if (key.startsWith('_')) continue
        matchingFields.push({ label: key, value: String(val) })
        if (matchingFields.length >= 3) break
      }
    }

    return { title: titleValue || 'Untitled', fields: matchingFields }
  }, [result.data, columns, query])

  return (
    <button
      onClick={onClick}
      className="gba:w-full gba:text-left gba:px-3 gba:py-2.5 gba:hover:bg-muted/40 gba:transition-colors gba:group"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-start gba:gap-2.5">
        <div className="gba:w-7 gba:h-7 gba:rounded gba:bg-primary/8 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:mt-0.5">
          {showBoardName ? (
            <LayoutGrid className="gba:w-3.5 gba:h-3.5 gba:text-primary/60" />
          ) : (
            <FileText className="gba:w-3.5 gba:h-3.5 gba:text-primary/60" />
          )}
        </div>

        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-0.5">
            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
              <HighlightedText text={title} query={query} />
            </span>
            <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
              <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4">
                {result.source === 'semantic' ? 'AI' : 'Match'}
              </Badge>
            </div>
          </div>

          {fields.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1">
              {fields.map((f, i) => (
                <span
                  key={i}
                  className="gba:inline-flex gba:items-center gba:text-[11px] gba:text-muted-foreground gba:bg-muted/40 gba:rounded gba:px-1.5 gba:py-0.5 gba:max-w-48 gba:truncate"
                >
                  <span className="gba:text-muted-foreground/60 gba:mr-1">{f.label}:</span>
                  <HighlightedText text={truncate(f.value, 40)} query={query} />
                </span>
              ))}
            </div>
          )}

          {(showBoardName || result.sheetName) && (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-1">
              {showBoardName && result.boardName && (
                <span className="gba:text-[10px] gba:text-muted-foreground/70">{result.boardName}</span>
              )}
              {showBoardName && result.boardName && result.sheetName && (
                <span className="gba:text-muted-foreground/30">/</span>
              )}
              {result.sheetName && (
                <span className="gba:text-[10px] gba:text-muted-foreground/70">{result.sheetName}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="gba:bg-warning/20 gba:text-foreground gba:font-semibold gba:rounded-sm gba:px-0.5">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}

function formatValue(raw: unknown, type: string): string {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  if (Array.isArray(raw)) return raw.map(v => String(v)).join(', ')
  if (type === 'date' || type === 'datetime') {
    const d = new Date(String(raw))
    return isNaN(d.getTime())
      ? String(raw)
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (type === 'currency') return `$${Number(raw).toLocaleString()}`
  if (type === 'percentage') return `${Number(raw)}%`
  return String(raw)
}

function firstTextValue(data: Record<string, unknown>): string {
  for (const val of Object.values(data)) {
    if (typeof val === 'string' && val.trim() && !val.startsWith('{')) return val
  }
  return ''
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + '...'
}
