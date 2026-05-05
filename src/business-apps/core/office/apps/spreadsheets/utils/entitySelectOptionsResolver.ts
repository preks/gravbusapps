/**
 * Resolves bulk-collection SELECT field options from flow-engine entity datasource (shared contract with useEntityDataSource).
 */

import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import type { BulkCollectionEntitySelectConfig, AutomationInputOption } from '../types/automation'

const MAX_ENTITY_SELECT_LIMIT = 500

const OPERATOR_MAP: Record<string, string> = {
  eq: 'eq',
  neq: 'neq',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  in: 'in',
  nin: 'nin',
  like: 'like',
  ilike: 'ilike',
  isNull: 'isNull',
  isNotNull: 'isNotNull',
  contains: 'contains'
}

function substituteVariables(value: unknown, userId?: string): unknown {
  if (typeof value !== 'string') return value

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const replacements: Record<string, string> = {
    '{{currentUserId}}': userId || '',
    '{{today}}': now.toISOString().split('T')[0],
    '{{now}}': now.toISOString(),
    '{{startOfMonth}}': startOfMonth.toISOString(),
    '{{endOfMonth}}': endOfMonth.toISOString(),
    '{{startOfYear}}': startOfYear.toISOString()
  }

  let result = value
  for (const [template, replacement] of Object.entries(replacements)) {
    result = result.replace(template, replacement)
  }

  return result
}

function buildApiFilters(
  group: BulkCollectionEntitySelectConfig['filters'],
  userId?: string
): Array<{ field: string; operator: string; value: unknown }> {
  const filters: Array<{ field: string; operator: string; value: unknown }> = []

  for (const condition of group.conditions) {
    if (!condition.isActive) continue

    const value = substituteVariables(condition.value, userId)

    if (value === null || value === undefined || value === '') {
      if (condition.operator !== 'isNull' && condition.operator !== 'isNotNull') {
        continue
      }
    }

    filters.push({
      field: condition.field,
      operator: OPERATOR_MAP[condition.operator] || condition.operator,
      value
    })
  }

  if (group.groups) {
    for (const nestedGroup of group.groups) {
      filters.push(...buildApiFilters(nestedGroup, userId))
    }
  }

  return filters
}

function buildApiOrderBy(
  orderBy: BulkCollectionEntitySelectConfig['orderBy']
): Array<{ field: string; direction: string }> {
  return orderBy.map(sort => ({
    field: sort.field,
    direction: sort.direction
  }))
}

export function getNestedFieldValue(record: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let cur: unknown = record
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return undefined
    }
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function recordsToSelectOptions(
  records: Record<string, unknown>[],
  valueField: string,
  labelField: string
): AutomationInputOption[] {
  const out: AutomationInputOption[] = []
  const seen = new Set<string>()

  for (const rec of records) {
    const rawVal = getNestedFieldValue(rec, valueField)
    const rawLabel = getNestedFieldValue(rec, labelField)
    const value = rawVal !== undefined && rawVal !== null ? String(rawVal) : ''
    const label = rawLabel !== undefined && rawLabel !== null ? String(rawLabel) : value
    if (!value.trim()) continue
    if (seen.has(value)) continue
    seen.add(value)
    out.push({ value, label: label.trim() || value })
  }

  return out
}

/**
 * Load entity rows and map to flow SELECT options.
 */
export async function fetchBulkCollectionEntitySelectOptions(
  accessToken: string,
  config: BulkCollectionEntitySelectConfig,
  userId?: string
): Promise<AutomationInputOption[]> {
  if (!accessToken?.trim()) {
    return []
  }

  const entityType = config.entityType?.trim()
  if (!entityType || !config.valueField?.trim() || !config.labelField?.trim()) {
    return []
  }

  const limit = Math.min(Math.max(config.limit || 0, 1), MAX_ENTITY_SELECT_LIMIT)

  try {
    const base = getFlowEngineApiBaseUrl()
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (config.entityKind) {
      params.set('kind', config.entityKind)
    }
    if (config.namespace) {
      params.set('namespace', config.namespace)
    }
    if (config.labelField) {
      params.set('labelField', config.labelField)
    }

    const filters = buildApiFilters(config.filters, userId)
    if (filters.length > 0) {
      params.set('filters', JSON.stringify(filters))
    }

    if (config.orderBy.length > 0) {
      params.set('orderBy', JSON.stringify(buildApiOrderBy(config.orderBy)))
    }

    const queryString = params.toString()
    const url = `${base}/datasource/${encodeURIComponent(entityType)}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      console.error('[fetchBulkCollectionEntitySelectOptions] Request failed', response.status)
      return []
    }

    const data = (await response.json()) as { entities?: Record<string, unknown>[] }
    const records = Array.isArray(data.entities) ? data.entities : []
    return recordsToSelectOptions(records, config.valueField, config.labelField)
  } catch {
    console.error('[fetchBulkCollectionEntitySelectOptions] Error loading entity options')
    return []
  }
}
