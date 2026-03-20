/**
 * Shared column type definitions used across column creation, editing, and settings.
 */

import type { BoardColumnType } from '../../types'

export interface ColumnTypeDef {
  type: BoardColumnType
  label: string
  /** Types that need extra config (dialog) before creation. */
  needsConfig?: boolean
  /** Computed types whose type cannot be changed after creation. */
  isComputed?: boolean
}

/** Quick-add types shown in the popover (most common, ordered by frequency). */
export const QUICK_ADD_TYPES: ColumnTypeDef[] = [
  { type: 'text', label: 'Text' },
  { type: 'number', label: 'Number' },
  { type: 'status', label: 'Status' },
  { type: 'priority', label: 'Priority' },
  { type: 'date', label: 'Date' },
  { type: 'datetime', label: 'Date & Time' },
  { type: 'select', label: 'Select' },
  { type: 'multiselect', label: 'Multi-Select' },
  { type: 'boolean', label: 'Checkbox' },
  { type: 'people', label: 'People' },
  { type: 'currency', label: 'Currency' },
  { type: 'percentage', label: 'Percentage' },
  { type: 'rating', label: 'Rating' },
  { type: 'progress', label: 'Progress' },
  { type: 'email', label: 'Email' },
  { type: 'phone', label: 'Phone' },
  { type: 'url', label: 'URL' },
  { type: 'tags', label: 'Tags' },
  { type: 'relation', label: 'Relation', needsConfig: true },
  { type: 'mirror', label: 'Mirror', needsConfig: true, isComputed: true },
  { type: 'rollup', label: 'Rollup', needsConfig: true, isComputed: true }
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

export function getTypeLabel(type: BoardColumnType): string {
  return QUICK_ADD_TYPES.find(t => t.type === type)?.label || type
}
