export type ResultRendererType = 'table' | 'chart' | 'markdown' | 'json' | 'text' | 'expert_output'

function detectRendererForArray(result: unknown[]): ResultRendererType {
  if (result.length === 0) return 'text'
  const first = result[0]
  if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
    const keys = Object.keys(first)
    const hasNumericValue = keys.some(k => typeof (first as Record<string, unknown>)[k] === 'number')
    const hasLabelKey = keys.some(k => ['label', 'name', 'date', 'time', 'period'].includes(k.toLowerCase()))
    if (hasNumericValue && hasLabelKey) return 'chart'
    return 'table'
  }
  return 'text'
}

function detectRendererForObject(obj: Record<string, unknown>): ResultRendererType {
  if ('labels' in obj && 'values' in obj) return 'chart'
  return 'json'
}

function detectRendererForString(result: string): ResultRendererType {
  const trimmed = result.trimStart()
  if (trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('|') || trimmed.includes('\n\n')) {
    return 'markdown'
  }
  return 'text'
}

/**
 * Detects the best renderer for a tool result value.
 */
export function detectRendererType(result: unknown): ResultRendererType {
  if (result === null || result === undefined) return 'text'

  if (Array.isArray(result)) {
    return detectRendererForArray(result)
  }

  if (typeof result === 'object') {
    return detectRendererForObject(result as Record<string, unknown>)
  }

  if (typeof result === 'string') {
    return detectRendererForString(result)
  }

  return 'text'
}

/** Tool category → colour class for badge styling */
export function toolCategoryColor(toolName: string): string {
  if (toolName.startsWith('graphql_')) return 'gba:bg-muted gba:text-foreground'
  if (toolName.startsWith('call_function') || toolName === 'newwork.functions')
    return 'gba:bg-muted gba:text-foreground'
  if (toolName.startsWith('trigger_flow') || toolName === 'newwork.flow') return 'gba:bg-muted gba:text-foreground'
  if (toolName.startsWith('call_expert') || toolName === 'expert.' || toolName === 'newwork.expert')
    return 'gba:bg-muted gba:text-foreground'
  if (toolName.startsWith('knowledge_') || toolName === 'newwork.knowledge') return 'gba:bg-muted gba:text-foreground'
  if (toolName === 'write_todos') return 'gba:bg-muted gba:text-muted-foreground'
  if (
    toolName === 'save_memory' ||
    toolName === 'search_memory' ||
    toolName === 'forget_memory' ||
    toolName === 'forget_about'
  )
    return 'gba:bg-muted gba:text-foreground'
  if (toolName === 'task') return 'gba:bg-muted gba:text-foreground'
  return 'gba:bg-muted gba:text-muted-foreground'
}

/** Format milliseconds as a human-readable duration string */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * Backend timestamps may arrive as "naive" ISO strings without a timezone
 * suffix (e.g. `"2026-04-22T08:22:55.123456"`). This happens because MongoDB
 * stores `datetime` objects as UTC but PyMongo (with default `tz_aware=False`)
 * deserializes them as naive `datetime`s, whose `.isoformat()` omits the
 * offset. Per ECMAScript, `new Date(<date-time-without-offset>)` treats such
 * strings as **local time**, which produces an apparent skew equal to the
 * user's UTC offset (e.g. a "2h ago" label for a session created 5 minutes
 * ago in UTC+2).
 *
 * This helper normalizes the input: if the string contains a time component
 * but no timezone suffix, append `Z` so the browser parses it as UTC. Strings
 * that already carry a `Z`, `z`, or `±HH:MM` / `±HHMM` offset are untouched,
 * as are `Date` inputs and date-only strings (which ES parses as UTC anyway).
 */
export function parseIsoTimestamp(input: string | Date | null | undefined): Date | null {
  if (input === null || input === undefined) return null
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input

  const trimmed = input.trim()
  if (!trimmed) return null

  const hasTime = trimmed.includes('T') || trimmed.includes('t') || / \d{2}:\d{2}/.test(trimmed)
  const hasOffset = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)
  const normalized = hasTime && !hasOffset ? `${trimmed}Z` : trimmed

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Convenience: parse to epoch milliseconds, or `null` if unparseable. */
export function parseIsoTimestampMs(input: string | Date | null | undefined): number | null {
  const date = parseIsoTimestamp(input)
  return date ? date.getTime() : null
}

/** Format relative time from ISO string */
export function formatRelativeTime(isoString: string): string {
  const date = parseIsoTimestamp(isoString)
  if (!date) return ''
  const now = new Date()
  // Clamp small negative diffs (e.g. backend clock slightly ahead of the
  // browser) to 0 so we render "Just now" instead of a confusing future label.
  const diff = Math.max(0, now.getTime() - date.getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
