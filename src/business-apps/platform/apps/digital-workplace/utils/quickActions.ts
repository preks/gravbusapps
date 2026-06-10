import {
  ChartLineUpIcon,
  EnvelopeSimpleIcon,
  NotePencilIcon,
  CalendarCheckIcon,
  ListChecksIcon,
  UsersThreeIcon,
  MagnifyingGlassIcon,
  FileTextIcon,
  SparkleIcon,
  type Icon
} from '@phosphor-icons/react'

/**
 * A one-click action that hands a ready-made prompt to EveryFabric. Icons are
 * stored as a stable string key (not the component) so the set can be persisted
 * to localStorage and re-hydrated safely.
 */
export interface QuickAction {
  id: string
  iconKey: string
  label: string
  prompt: string
}

/** Stable string key → Phosphor icon. The first entry is the safe fallback. */
export const QUICK_ACTION_ICONS: Record<string, Icon> = {
  sparkle: SparkleIcon,
  analytics: ChartLineUpIcon,
  mail: EnvelopeSimpleIcon,
  note: NotePencilIcon,
  calendar: CalendarCheckIcon,
  tasks: ListChecksIcon,
  people: UsersThreeIcon,
  search: MagnifyingGlassIcon,
  document: FileTextIcon
}

export const QUICK_ACTION_ICON_KEYS = Object.keys(QUICK_ACTION_ICONS)

export const DEFAULT_QUICK_ACTION_ICON_KEY = 'sparkle'

export function resolveQuickActionIcon(iconKey: string): Icon {
  return QUICK_ACTION_ICONS[iconKey] ?? QUICK_ACTION_ICONS[DEFAULT_QUICK_ACTION_ICON_KEY]
}

export function nextQuickActionIconKey(iconKey: string): string {
  const index = QUICK_ACTION_ICON_KEYS.indexOf(iconKey)
  return QUICK_ACTION_ICON_KEYS[(index + 1) % QUICK_ACTION_ICON_KEYS.length]
}

export function createEmptyQuickAction(): QuickAction {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `qa-${Date.now()}`
  return { id, iconKey: DEFAULT_QUICK_ACTION_ICON_KEY, label: '', prompt: '' }
}

export function isQuickAction(value: unknown): value is QuickAction {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.iconKey === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.prompt === 'string'
  )
}
