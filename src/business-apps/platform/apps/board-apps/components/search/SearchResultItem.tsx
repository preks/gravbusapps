import React, { useMemo } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { FileText, Sparkles, Hash } from 'lucide-react'
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LONG_HEX_RE = /^[0-9a-f]{20,}$/i
const ID_KEY_RE = /(?:^id$|Id$|_id$|ID$|uuid|_key$|_ref$)/

function isHumanUnreadable(key: string, value: unknown): boolean {
  if (key.startsWith('_')) return true
  if (ID_KEY_RE.test(key)) return true
  if (value === null || value === undefined) return true
  const str = String(value)
  if (str.length === 0) return true
  if (UUID_RE.test(str)) return true
  if (LONG_HEX_RE.test(str)) return true
  if (str.startsWith('{') || str.startsWith('[')) return true
  if (/^\d{13,}$/.test(str)) return true
  return false
}

function pickTitle(data: Record<string, unknown>, cols: BoardColumn[]): string {
  const primary = cols.find(c => c.isPrimary) || cols[0]
  if (primary) {
    const v = String(data[primary.name] || '')
    if (v && !UUID_RE.test(v) && !LONG_HEX_RE.test(v)) return v
  }
  for (const col of cols) {
    if (col.type === 'text' || col.type === 'email') {
      const v = String(data[col.name] || '')
      if (v && !UUID_RE.test(v)) return v
    }
  }
  for (const val of Object.values(data)) {
    if (typeof val === 'string' && val.trim() && !UUID_RE.test(val) && !val.startsWith('{')) return val
  }
  return 'Untitled'
}

function pickFields(
  data: Record<string, unknown>,
  cols: BoardColumn[],
  primaryName: string | undefined,
  query: string,
  max: number
): Array<{ label: string; value: string; isMatch: boolean }> {
  const lq = query.toLowerCase()
  const fields: Array<{ label: string; value: string; isMatch: boolean }> = []

  if (cols.length > 0) {
    for (const col of cols) {
      if (col.name === primaryName) continue
      if (isHumanUnreadable(col.name, data[col.name])) continue
      const str = formatValue(data[col.name], col.type)
      if (!str) continue
      const isMatch = str.toLowerCase().includes(lq)
      fields.push({ label: col.label, value: str, isMatch })
      if (fields.length >= max + 2) break
    }
  } else {
    for (const [key, val] of Object.entries(data)) {
      if (isHumanUnreadable(key, val)) continue
      const str = String(val)
      const isMatch = str.toLowerCase().includes(lq)
      fields.push({ label: humanizeKey(key), value: truncate(str, 60), isMatch })
      if (fields.length >= max + 2) break
    }
  }

  const matches = fields.filter(f => f.isMatch)
  const rest = fields.filter(f => !f.isMatch)
  return [...matches, ...rest].slice(0, max)
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  query,
  columns,
  showBoardName,
  onClick,
  'data-testid': testId
}) => {
  const cols = columns || []
  const primary = cols.find(c => c.isPrimary) || cols[0]

  const { title, fields } = useMemo(() => {
    const data = result.data || {}
    const t = pickTitle(data, cols)
    const f = pickFields(data, cols, primary?.name, query, 3)
    return { title: t, fields: f }
  }, [result.data, cols, primary?.name, query])

  const isSemantic = result.source === 'semantic'

  return (
    <button
      onClick={onClick}
      className="gba:w-full gba:text-left gba:px-3.5 gba:py-3 gba:hover:bg-accent/40 gba:transition-colors gba:group gba:cursor-pointer"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-start gba:gap-3">
        <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 gba:mt-0.5">
          {isSemantic ? (
            <Sparkles className="gba:w-3.5 gba:h-3.5 gba:text-primary" />
          ) : (
            <FileText className="gba:w-3.5 gba:h-3.5 gba:text-primary/70" />
          )}
        </div>

        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:leading-tight">
              <HighlightedText text={truncate(title, 80)} query={query} />
            </span>
            {isSemantic && (
              <Badge variant="info" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4 gba:flex-shrink-0">
                AI
              </Badge>
            )}
          </div>

          {fields.length > 0 && (
            <div className="gba:flex gba:flex-wrap gba:gap-x-3 gba:gap-y-0.5 gba:mt-1.5">
              {fields.map((f, i) => (
                <span key={i} className="gba:inline-flex gba:items-baseline gba:text-xs gba:max-w-56 gba:truncate">
                  <span className="gba:text-muted-foreground/50 gba:mr-1 gba:font-medium">{f.label}</span>
                  <span className="gba:text-muted-foreground">
                    <HighlightedText text={truncate(f.value, 50)} query={query} />
                  </span>
                </span>
              ))}
            </div>
          )}

          {(showBoardName || result.sheetName) && (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-1.5">
              <Hash className="gba:w-3 gba:h-3 gba:text-muted-foreground/40" />
              {showBoardName && result.boardName && (
                <span className="gba:text-[11px] gba:text-muted-foreground/60">{result.boardName}</span>
              )}
              {showBoardName && result.boardName && result.sheetName && (
                <span className="gba:text-muted-foreground/30">&rsaquo;</span>
              )}
              {result.sheetName && (
                <span className="gba:text-[11px] gba:text-muted-foreground/60">{result.sheetName}</span>
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
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="gba:bg-warning/25 gba:text-foreground gba:font-semibold gba:rounded-sm gba:px-px">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
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
  if (type === 'currency') {
    const n = Number(raw)
    return isNaN(n) ? String(raw) : `$${n.toLocaleString()}`
  }
  if (type === 'percentage') {
    const n = Number(raw)
    return isNaN(n) ? String(raw) : `${n}%`
  }
  const str = String(raw)
  if (UUID_RE.test(str) || LONG_HEX_RE.test(str)) return ''
  return str
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + '\u2026'
}
