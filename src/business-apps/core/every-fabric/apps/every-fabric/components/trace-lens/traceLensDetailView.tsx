// Trace Lens — human-readable span detail rendering.
//
// Renders JSON-ish inputs/outputs as labeled fields, badges, and prose blocks
// while Copy buttons still export the same pretty-printed text as before.

import { Badge } from '@newwork/nw-design-system'
import { prettyValue } from './traceLensModel'

export type DisplayFieldVariant = 'prose' | 'badge' | 'boolean' | 'tags' | 'stat' | 'nested' | 'raw'

export interface DisplayField {
  key: string
  label: string
  variant: DisplayFieldVariant
  value: unknown
  children?: DisplayField[]
}

const PROSE_KEYS = new Set([
  'rationale',
  'reason',
  'summary',
  'description',
  'message',
  'content',
  'task',
  'task_summary',
  'agent_description',
  'output',
  'completion_preview',
  'title',
  'error',
  'plan_summary'
])

const BADGE_KEYS = new Set([
  'mode',
  'status',
  'route',
  'stage',
  'finish_reason',
  'error_type',
  'step_type',
  'type',
  'agent_name',
  'expert_name'
])

const STAT_KEYS = new Set(['nested_tool_count', 'duration_ms', 'total_tokens', 'cost_usd'])

const TAG_LIST_KEYS = new Set([
  'experts',
  'required_capabilities',
  'capabilities',
  'tools',
  'skills',
  'policies',
  'tags',
  'missing_capabilities'
])

/** LLM metadata already shown in the stats grid — omit from the Details section. */
export const LLM_DETAIL_META_KEYS = new Set([
  'type',
  'model',
  'stage',
  'call_num',
  'prompt_tokens',
  'cached_prompt_tokens',
  'completion_tokens',
  'total_tokens',
  'cache_hit_ratio',
  'cost_usd',
  'finish_reason',
  'duration_ms',
  'completion_preview'
])

export function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .map(item => {
      if (typeof item === 'string') return item
      if (isPlainObject(item)) {
        return (
          (typeof item.name === 'string' && item.name) ||
          (typeof item.id === 'string' && item.id) ||
          (typeof item.tool_ref === 'string' && item.tool_ref) ||
          null
        )
      }
      return null
    })
    .filter((item): item is string => Boolean(item))
  return items.length > 0 ? items : null
}

export function parseJsonish(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function pickVariant(key: string, value: unknown, depth: number): DisplayFieldVariant {
  if (typeof value === 'boolean') return 'boolean'
  if (STAT_KEYS.has(key) && typeof value === 'number' && Number.isFinite(value)) return 'stat'
  if (typeof value === 'number' && Number.isFinite(value)) return 'stat'
  if (PROSE_KEYS.has(key) && typeof value === 'string') return 'prose'
  if (BADGE_KEYS.has(key) && (typeof value === 'string' || typeof value === 'number')) return 'badge'
  const tags = asStringArray(value)
  if (TAG_LIST_KEYS.has(key) && tags) return 'tags'
  if (Array.isArray(value) && tags) return 'tags'
  if (typeof value === 'string') {
    if (value.length > 120 || value.includes('\n')) return 'prose'
    return 'badge'
  }
  if (isPlainObject(value) && depth < 2 && Object.keys(value).length > 0) return 'nested'
  return 'raw'
}

function buildField(key: string, value: unknown, depth = 0): DisplayField | null {
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value) && value.length === 0) return null

  const variant = pickVariant(key, value, depth)
  const field: DisplayField = { key, label: humanizeKey(key), variant, value }

  if (variant === 'nested' && isPlainObject(value)) {
    field.children = buildDisplayFields(value, depth + 1)
    if (field.children.length === 0) return null
  }

  if (variant === 'tags') {
    const tags = asStringArray(value)
    if (!tags || tags.length === 0) return null
    field.value = tags
  }

  if (variant === 'raw') {
    field.value = prettyValue(value)
  }

  return field
}

export function buildDisplayFields(value: unknown, depth = 0): DisplayField[] {
  const parsed = parseJsonish(value)
  if (!isPlainObject(parsed)) return []

  const fields: DisplayField[] = []
  for (const [key, child] of Object.entries(parsed)) {
    const field = buildField(key, child, depth)
    if (field) fields.push(field)
  }
  return fields
}

export function isStructuredDisplayable(value: unknown): boolean {
  const parsed = parseJsonish(value)
  return isPlainObject(parsed) && buildDisplayFields(parsed).length > 0
}

export function copyTextForValue(value: unknown): string {
  return prettyValue(value)
}

export function detailWithoutLlmMeta(detail: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!detail) return undefined
  const copy: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(detail)) {
    if (key === 'type' || LLM_DETAIL_META_KEYS.has(key)) continue
    copy[key] = value
  }
  return Object.keys(copy).length > 0 ? copy : undefined
}

function BooleanPill({ value, t }: Readonly<{ value: boolean; t: (key: string) => string }>) {
  return (
    <Badge variant={value ? 'default' : 'outline'} className="gba:text-[11px]">
      {value ? t('trace-lens-detail-yes') : t('trace-lens-detail-no')}
    </Badge>
  )
}

function FieldValue({ field, t }: Readonly<{ field: DisplayField; t: (key: string) => string }>) {
  switch (field.variant) {
    case 'prose':
      return (
        <p className="gba:text-[13px] gba:leading-relaxed gba:text-foreground gba:whitespace-pre-wrap gba:break-words">
          {String(field.value)}
        </p>
      )
    case 'badge':
      return (
        <Badge variant="outline" className="gba:text-[11px] gba:font-medium">
          {String(field.value)}
        </Badge>
      )
    case 'boolean':
      return <BooleanPill value={Boolean(field.value)} t={t} />
    case 'tags': {
      const tags = field.value as string[]
      if (tags.length === 0) {
        return <span className="gba:text-[12px] gba:text-muted-foreground">{t('trace-lens-detail-none')}</span>
      }
      return (
        <div className="gba:flex gba:flex-wrap gba:gap-1.5">
          {tags.map(tag => (
            <Badge key={tag} variant="outline" className="gba:text-[11px]">
              {tag}
            </Badge>
          ))}
        </div>
      )
    }
    case 'stat':
      return (
        <span className="gba:text-[13px] gba:font-medium gba:text-foreground gba:tabular-nums">
          {String(field.value)}
        </span>
      )
    case 'nested':
      return (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:rounded-md gba:border gba:border-border/30 gba:bg-background/60 gba:p-2.5">
          {(field.children ?? []).map(child => (
            <DisplayFieldRow key={child.key} field={child} compact t={t} />
          ))}
        </div>
      )
    case 'raw':
    default:
      return (
        <pre className="gba:text-[12px] gba:leading-relaxed gba:text-foreground gba:whitespace-pre-wrap gba:break-words">
          {String(field.value)}
        </pre>
      )
  }
}

function DisplayFieldRow({
  field,
  compact = false,
  t
}: Readonly<{ field: DisplayField; compact?: boolean; t: (key: string) => string }>) {
  return (
    <div className={`gba:flex gba:flex-col ${compact ? 'gba:gap-1' : 'gba:gap-1.5'}`}>
      <span className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {field.label}
      </span>
      <FieldValue field={field} t={t} />
    </div>
  )
}

export function StructuredValueView({ value, t }: Readonly<{ value: unknown; t: (key: string) => string }>) {
  const fields = buildDisplayFields(value)
  if (fields.length === 0) return null

  return (
    <div className="gba:flex gba:flex-col gba:gap-3 gba:rounded-md gba:border gba:border-border/40 gba:bg-muted/30 gba:p-3">
      {fields.map(field => (
        <DisplayFieldRow key={field.key} field={field} t={t} />
      ))}
    </div>
  )
}
