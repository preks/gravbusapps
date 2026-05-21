import type {
  GlobalSearchAccessControlType,
  GlobalSearchEntityActionConfig,
  GlobalSearchEntityKind,
  GlobalSearchEntityType,
  GlobalSearchEntityTypePayload
} from '@/common/network/global-search/GlobalSearchClient'

export type BadgeVariant = 'success' | 'destructive' | 'info' | 'secondary'

export const ENTITY_KIND_OPTIONS: GlobalSearchEntityKind[] = [
  'PROFILE',
  'RECORD',
  'COLLECTION',
  'FILE',
  'PAGE',
  'ACTION',
  'ACTIVITY'
]

export const ACCESS_CONTROL_OPTIONS: GlobalSearchAccessControlType[] = ['ACL', 'OWNER', 'PUBLIC']

export const DEFAULT_SEARCH_CONFIG = {
  source: { from: 'schema.table alias' },
  projections: {
    documentId: 'alias.id',
    title: 'alias.name',
    metadata: 'jsonb_build_object()',
    updatedAt: 'alias.updated_at'
  },
  search: { fields: ['alias.name'] },
  access: {}
}

export const DEFAULT_ACTION_CONFIG: GlobalSearchEntityActionConfig = {}

export interface EntityFormValues {
  entityType: string
  entityTypeLabel: string
  categoryKey: string
  categoryLabel: string
  kind: GlobalSearchEntityKind
  icon: string
  accessControlType: GlobalSearchAccessControlType
  active: boolean
  sortOrder: string
  actionConfig: string
  searchConfig: string
}

export function entityToFormValues(entity?: GlobalSearchEntityType): EntityFormValues {
  return {
    entityType: entity?.entityType ?? '',
    entityTypeLabel: entity?.entityTypeLabel ?? '',
    categoryKey: entity?.categoryKey ?? '',
    categoryLabel: entity?.categoryLabel ?? '',
    kind: entity?.kind ?? 'RECORD',
    icon: entity?.icon ?? 'search',
    accessControlType: entity?.accessControlType ?? 'PUBLIC',
    active: entity?.active ?? true,
    sortOrder: String(entity?.sortOrder ?? 0),
    actionConfig: JSON.stringify(entity?.actionConfig ?? DEFAULT_ACTION_CONFIG, null, 2),
    searchConfig: JSON.stringify(entity?.searchConfig ?? DEFAULT_SEARCH_CONFIG, null, 2)
  }
}

export function parseJsonField<T extends object = Record<string, unknown>>(value: string, label: string): T {
  try {
    const parsedValue: unknown = JSON.parse(value || '{}')
    if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
      return parsedValue as T
    }
  } catch {
    throw new Error(`${label} must be valid JSON`)
  }

  throw new Error(`${label} must be a JSON object`)
}

export function buildEntityPayload(values: EntityFormValues): GlobalSearchEntityTypePayload {
  return {
    entityType: values.entityType.trim().toUpperCase(),
    entityTypeLabel: values.entityTypeLabel.trim(),
    categoryKey: values.categoryKey.trim(),
    categoryLabel: values.categoryLabel.trim(),
    kind: values.kind,
    icon: values.icon.trim() || 'search',
    accessControlType: values.accessControlType,
    active: values.active,
    sortOrder: Number.parseInt(values.sortOrder, 10) || 0,
    actionConfig: parseJsonField<GlobalSearchEntityActionConfig>(values.actionConfig, 'Action config'),
    searchConfig: parseJsonField(values.searchConfig, 'Search config')
  }
}

export function jobStateBadgeVariant(state: string): BadgeVariant {
  if (state === 'completed') return 'success'
  if (state === 'failed') return 'destructive'
  if (state === 'active') return 'info'
  return 'secondary'
}

export function entityStatusBadgeVariant(active: boolean): BadgeVariant {
  return active ? 'success' : 'secondary'
}

export function formatCount(value: number | undefined): string {
  if (!value) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}
