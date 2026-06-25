// Renders a flow step's captured data as a flat label/value list. Nested
// wrapper objects (e.g. a FUNCTION step's `Response` -> `body` -> `result`) are
// flattened so only the meaningful leaf fields show as clean rows, matching the
// platform Flow Detail "Captured data" look. Reuses the platform leaf renderer
// (`FieldValueDisplay`) so files, markdown and primitives display identically.
// Shared by the workforce list view and map detail panel.

import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'

import {
  FieldValueDisplay,
  generateFieldLabel,
  isFieldVisibleForDisplay,
  isHiddenTransportField,
  isFileLikeValue,
  type StepResultDisplayConfig
} from '@/common/components/flow/flow-detail/tabs/stepDataRendering'

import translations from '../../../_i18n'

const MAX_DEPTH = 8

interface LeafRow {
  path: string
  fieldKey: string
  label: string
  value: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function hasVisibleValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function isPrimitiveArray(value: unknown[]): boolean {
  return value.every(item => item === null || typeof item !== 'object')
}

function leafLabel(key: string, value: unknown): string {
  return isFileLikeValue(value) ? 'Document' : generateFieldLabel(key)
}

function flattenArray(key: string, path: string, items: unknown[], depth: number, rows: LeafRow[]): void {
  items.forEach((item, index) => {
    const itemPath = `${path}.${index}`
    if (isPlainObject(item) && depth < MAX_DEPTH) {
      flatten(item, itemPath, depth + 1, rows)
      return
    }
    rows.push({ path: itemPath, fieldKey: key, label: `${generateFieldLabel(key)} ${index + 1}`, value: item })
  })
}

function flatten(data: Record<string, unknown>, parentPath: string, depth: number, rows: LeafRow[]): void {
  for (const [key, rawValue] of Object.entries(data)) {
    if (!hasVisibleValue(rawValue)) continue
    if (isHiddenTransportField(key)) continue

    const path = parentPath ? `${parentPath}.${key}` : key

    if (isFileLikeValue(rawValue)) {
      rows.push({ path, fieldKey: key, label: 'Document', value: rawValue })
      continue
    }

    const value = parseMaybeJson(rawValue)

    if (isPlainObject(value) && depth < MAX_DEPTH) {
      flatten(value, path, depth + 1, rows)
      continue
    }

    if (Array.isArray(value) && !isPrimitiveArray(value) && depth < MAX_DEPTH) {
      flattenArray(key, path, value, depth, rows)
      continue
    }

    rows.push({ path, fieldKey: key, label: leafLabel(key, value), value })
  }
}

export interface StepResultDataProps {
  formData: Record<string, unknown>
  accessToken?: string
  /**
   * Optional per-step allow/deny list from the flow template. Applied to leaf
   * fields after flattening so wrapper objects are still traversed.
   */
  resultDisplay?: StepResultDisplayConfig
}

export const StepResultData: React.FC<StepResultDataProps> = ({ formData, accessToken, resultDisplay }) => {
  const { t } = useTranslation(translations)
  const allRows: LeafRow[] = []
  flatten(formData ?? {}, '', 0, allRows)
  const rows = resultDisplay ? allRows.filter(row => isFieldVisibleForDisplay(row.fieldKey, resultDisplay)) : allRows

  if (rows.length === 0) {
    return <p className="gba:text-xs gba:text-muted-foreground">{t('flow-step-data-empty')}</p>
  }

  return (
    <div className="gba:divide-y gba:divide-border gba:overflow-hidden gba:rounded-md gba:border gba:border-border gba:bg-card">
      {rows.map(row => (
        <div key={row.path} className="gba:space-y-1 gba:px-4 gba:py-3">
          <div className="gba:break-words gba:text-sm gba:font-medium gba:text-muted-foreground">{row.label}</div>
          <div className="gba:min-w-0 gba:text-sm gba:text-foreground">
            <FieldValueDisplay fieldKey={row.label} value={row.value} accessToken={accessToken} compact />
          </div>
        </div>
      ))}
    </div>
  )
}
