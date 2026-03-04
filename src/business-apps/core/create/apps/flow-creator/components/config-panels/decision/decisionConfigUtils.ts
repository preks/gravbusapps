import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

export type DueUnit = 'minutes' | 'hours' | 'days'
export const MINUTES_PER: Record<DueUnit, number> = { minutes: 1, hours: 60, days: 24 * 60 }

export function deriveTimeUnit(mins?: number): DueUnit {
  const m = Number(mins || 0)
  if (!m) return 'days'
  if (m % MINUTES_PER.days === 0) return 'days'
  if (m % MINUTES_PER.hours === 0) return 'hours'
  return 'minutes'
}

export const POLICY_PICKER_FIELDS: Array<keyof ContentEntry> = [
  'id',
  'title',
  'preview',
  'entryVersion',
  'contentGroupRef',
  'contentTypeRef',
  'contentGroup',
  'contentType',
  'contentEntryCategories',
  'contentEntryTags',
  'updatedAt',
  'additionalProperties'
]

type JsonSchema = Record<string, unknown>

function visitJsonSchemaNodeProps(
  props: Record<string, unknown>,
  prefix: string,
  out: string[],
  visitFn: (n: any, p: string) => void
): void {
  for (const [k, v] of Object.entries(props)) {
    const key = String(k || '').trim()
    if (!key) continue
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    out.push(nextPrefix)
    visitFn(v, nextPrefix)
  }
}

function visitJsonSchemaNodeAlts(node: any, prefix: string, visitFn: (n: any, p: string) => void): void {
  const alts = [...(Array.isArray(node.oneOf) ? node.oneOf : []), ...(Array.isArray(node.anyOf) ? node.anyOf : [])]
  for (const alt of alts) visitFn(alt, prefix)
  if (Array.isArray(node.allOf)) {
    for (const part of node.allOf) visitFn(part, prefix)
  }
}

function visitJsonSchemaNode(
  node: any,
  prefix: string,
  out: string[],
  visited: Set<unknown>,
  visitFn: (n: any, p: string) => void
): void {
  if (!node || typeof node !== 'object') return
  if (visited.has(node)) return
  visited.add(node)

  const type = node.type
  const props = type === 'object' ? node.properties : undefined
  if (props && typeof props === 'object') {
    visitJsonSchemaNodeProps(props as Record<string, unknown>, prefix, out, visitFn)
  }

  if (type === 'array' && node.items) {
    visitFn(node.items, prefix ? `${prefix}[]` : '[]')
  }

  visitJsonSchemaNodeAlts(node, prefix, visitFn)
}

export function collectJsonSchemaPaths(schema: unknown): string[] {
  const out: string[] = []
  const visited = new Set<unknown>()

  const visit = (node: any, prefix: string) => {
    visitJsonSchemaNode(node, prefix, out, visited, visit)
  }

  visit(schema as JsonSchema, '')
  return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b))
}

export type OperatorId =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
export type ValueType = 'boolean' | 'date' | 'datetime' | 'number' | 'string' | 'unknown'

export function stripQuotes(v: string): string {
  const s = String(v ?? '').trim()
  if (
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2) ||
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2)
  ) {
    return s.slice(1, -1)
  }
  return s
}

export function quoteSingle(v: string): string {
  const s = String(v ?? '').trim()
  if (!s) return ''
  const escaped = s.split("'").join(String.raw`\'`)
  return `'${escaped}'`
}

export function normalizeDatetimeLocal(rawDt: string): string {
  if (!rawDt) return ''
  const noZ = rawDt.endsWith('Z') ? rawDt.slice(0, -1) : rawDt
  return noZ.length >= 16 ? noZ.slice(0, 16) : noZ
}

export function stripTaskExpertPrefixForDisplay(value: string): string {
  const s = String(value ?? '').trim()
  const m = s.match(/^task\s*expert\s*[-—:]\s*(.+)$/i)
  return m?.[1]?.trim() || s
}
