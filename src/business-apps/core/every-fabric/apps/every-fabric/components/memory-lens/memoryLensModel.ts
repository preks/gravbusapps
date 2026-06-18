import { MEMORY_NAMESPACES, MEMORY_NAMESPACE_LABELS } from '../settings/agentSettings.types'
import type { MemoryNamespace } from '../settings/agentSettings.types'

/** A single long-term memory entry, normalized from the GET /memory/search payload. */
export interface MemoryLensEntry {
  key: string
  value: string
  namespace: MemoryNamespace
  title?: string
  tags: string[]
  entities: string[]
  occurredAt?: string
  updatedAt?: string
  salience?: number | null
  score?: number | null
}

export interface NamespaceCount {
  namespace: MemoryNamespace
  label: string
  count: number
}

export interface TopItem {
  label: string
  count: number
}

export interface SalienceBucket {
  id: string
  label: string
  count: number
}

export interface MemoryStats {
  total: number
  perNamespace: NamespaceCount[]
  topTags: TopItem[]
  topEntities: TopItem[]
  salienceBuckets: SalienceBucket[]
  highSalienceCount: number
  lastUpdated?: string
}

// Salience is 1 (routine) .. 10 (critical / explicitly asked to remember).
const SALIENCE_BUCKETS: Array<{ id: string; label: string; min: number; max: number }> = [
  { id: 'routine', label: 'Routine (1-3)', min: 1, max: 3 },
  { id: 'notable', label: 'Notable (4-6)', min: 4, max: 6 },
  { id: 'important', label: 'Important (7-8)', min: 7, max: 8 },
  { id: 'critical', label: 'Critical (9-10)', min: 9, max: 10 }
]

const HIGH_SALIENCE_THRESHOLD = 7

const effectiveSalience = (entry: MemoryLensEntry): number => {
  const raw = typeof entry.salience === 'number' && !Number.isNaN(entry.salience) ? entry.salience : 1
  if (raw < 1) return 1
  if (raw > 10) return 10
  return raw
}

const isoTimestamp = (entry: MemoryLensEntry): number => {
  const iso = entry.occurredAt || entry.updatedAt
  if (!iso) return 0
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

const rankCounts = (values: Iterable<string>, limit: number): TopItem[] => {
  const counts = new Map<string, number>()
  for (const value of values) {
    const clean = value.trim()
    if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

/** Collapse aggregate insights (counts, top tags/entities, salience spread, recency). */
export const computeStats = (entries: MemoryLensEntry[]): MemoryStats => {
  const perNamespace: NamespaceCount[] = MEMORY_NAMESPACES.map(namespace => ({
    namespace,
    label: MEMORY_NAMESPACE_LABELS[namespace],
    count: entries.filter(entry => entry.namespace === namespace).length
  }))

  const allTags = entries.flatMap(entry => entry.tags ?? [])
  const allEntities = entries.flatMap(entry => entry.entities ?? [])

  const salienceBuckets: SalienceBucket[] = SALIENCE_BUCKETS.map(bucket => ({
    id: bucket.id,
    label: bucket.label,
    count: entries.filter(entry => {
      const value = effectiveSalience(entry)
      return value >= bucket.min && value <= bucket.max
    }).length
  }))

  const highSalienceCount = entries.filter(entry => effectiveSalience(entry) >= HIGH_SALIENCE_THRESHOLD).length

  const newest = entries.reduce((latest, entry) => Math.max(latest, isoTimestamp(entry)), 0)

  return {
    total: entries.length,
    perNamespace,
    topTags: rankCounts(allTags, 12),
    topEntities: rankCounts(allEntities, 12),
    salienceBuckets,
    highSalienceCount,
    lastUpdated: newest > 0 ? new Date(newest).toISOString() : undefined
  }
}

const isWhitespace = (char: string): boolean => char.trim() === ''

const skipWhitespace = (value: string, startIndex: number): number => {
  let index = startIndex
  while (index < value.length && isWhitespace(value[index])) index += 1
  return index
}

const stripHeadingPrefix = (line: string): string => {
  const markerStart = skipWhitespace(line, 0)
  let markerEnd = markerStart
  while (markerEnd < line.length && line[markerEnd] === '#' && markerEnd - markerStart < 6) {
    markerEnd += 1
  }
  if (markerEnd === markerStart) return line
  return line.slice(skipWhitespace(line, markerEnd))
}

const stripBulletPrefix = (line: string): string => {
  const markerStart = skipWhitespace(line, 0)
  const marker = line[markerStart]
  if (marker !== '-' && marker !== '*') return line
  const contentStart = markerStart + 1
  if (contentStart >= line.length || !isWhitespace(line[contentStart])) return line
  return line.slice(skipWhitespace(line, contentStart))
}

const stripLinePrefixes = (value: string): string =>
  value
    .split('\n')
    .map(line => stripBulletPrefix(stripHeadingPrefix(line)))
    .join('\n')

const stripPairedMarker = (value: string, marker: string): string => {
  let result = ''
  let index = 0
  while (index < value.length) {
    if (value.startsWith(marker, index)) {
      const contentStart = index + marker.length
      const markerEnd = value.indexOf(marker, contentStart)
      const content = value.slice(contentStart, markerEnd)
      if (markerEnd > contentStart && !content.includes(marker[0])) {
        result += content
        index = markerEnd + marker.length
        continue
      }
    }
    result += value[index]
    index += 1
  }
  return result
}

const collapseWhitespace = (value: string): string => {
  let result = ''
  let previousWasWhitespace = false
  for (const char of value) {
    if (isWhitespace(char)) {
      if (!previousWasWhitespace) result += ' '
      previousWasWhitespace = true
      continue
    }
    result += char
    previousWasWhitespace = false
  }
  return result.trim()
}

/** Tidy legacy markdown (headings, bullets, bold/italic/code) into plain prose. */
export const cleanMemoryBody = (value: string): string =>
  collapseWhitespace(
    stripPairedMarker(stripPairedMarker(stripPairedMarker(stripLinePrefixes(value || ''), '**'), '*'), '`')
  )

const HEX_KEY = /^[0-9a-f]{6,}$/

/** Turn an auto-learned key into a readable title, falling back to the body. */
export const formatMemoryTitle = (entry: MemoryLensEntry): string => {
  if (entry.title?.trim()) return entry.title.trim()
  const stripped = entry.key.replace(/^(pattern|insight)-/i, '')
  if (HEX_KEY.test(stripped)) {
    const words = cleanMemoryBody(entry.value).split(' ').slice(0, 7).join(' ')
    return words || stripped
  }
  const words = stripped.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Time-of-day label ("14:32") for diary rows; empty when unparseable. */
export const timeLabel = (iso?: string): string => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** Full, human date+time for the detail panel ("Wed, Jun 11, 14:32"). */
export const fullDateTime = (iso?: string): string => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Compact relative date label ("Today", "3 days ago", "Mar 4"). */
export const relativeDate = (iso?: string): string => {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
