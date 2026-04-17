/**
 * Shared column type definitions used across column creation, editing, and settings.
 */

import type { BoardColumnType } from '../../types'

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

export interface ColumnTypeDef {
  type: BoardColumnType
  labelKey: string
  /** Types that need extra config (dialog) before creation. */
  needsConfig?: boolean
  /** Computed types whose type cannot be changed after creation. */
  isComputed?: boolean
}

/** Quick-add types shown in the popover (most common, ordered by frequency). */
export const QUICK_ADD_TYPES: ColumnTypeDef[] = [
  { type: 'text', labelKey: 'column-type-text' },
  { type: 'number', labelKey: 'column-type-number' },
  { type: 'status', labelKey: 'column-type-status' },
  { type: 'priority', labelKey: 'column-type-priority' },
  { type: 'date', labelKey: 'column-type-date' },
  { type: 'datetime', labelKey: 'column-type-datetime' },
  { type: 'select', labelKey: 'column-type-select' },
  { type: 'multiselect', labelKey: 'column-type-multiselect' },
  { type: 'boolean', labelKey: 'column-type-boolean' },
  { type: 'people', labelKey: 'column-type-people' },
  { type: 'currency', labelKey: 'column-type-currency' },
  { type: 'percentage', labelKey: 'column-type-percentage' },
  { type: 'rating', labelKey: 'column-type-rating' },
  { type: 'progress', labelKey: 'column-type-progress' },
  { type: 'email', labelKey: 'column-type-email' },
  { type: 'phone', labelKey: 'column-type-phone' },
  { type: 'url', labelKey: 'column-type-url' },
  { type: 'tags', labelKey: 'column-type-tags' },
  { type: 'relation', labelKey: 'column-type-relation', needsConfig: true },
  { type: 'mirror', labelKey: 'column-type-mirror', needsConfig: true, isComputed: true },
  { type: 'rollup', labelKey: 'column-type-rollup', needsConfig: true, isComputed: true }
]

/** All types available in the AddColumnDialog type selector. */
export const ALL_CREATABLE_TYPES: ColumnTypeDef[] = QUICK_ADD_TYPES

/**
 * Types a column can be changed TO from settings.
 * Excludes computed types (mirror, rollup) and relation (requires special config).
 */
export const CHANGEABLE_TYPES: ColumnTypeDef[] = QUICK_ADD_TYPES.filter(t => !t.needsConfig)

/** Types that require the full AddColumnDialog for configuration. */
export const CONFIG_REQUIRED_TYPES: Set<BoardColumnType> = new Set(
  QUICK_ADD_TYPES.filter(t => t.needsConfig).map(t => t.type)
)

export function getTypeLabel(t: TranslateFn, type: BoardColumnType): string {
  const def = QUICK_ADD_TYPES.find(columnType => columnType.type === type)
  return def ? t(def.labelKey) : type
}
