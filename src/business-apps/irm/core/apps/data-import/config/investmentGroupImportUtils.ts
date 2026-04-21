/**
 * Pure utilities for translating `InvestmentGroup` catalog entries into
 * descriptors the data-import flow can consume (tab id, entity type,
 * payload key, display label).
 */

import { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import { InvestmentImportGroupDescriptor } from '../types/commonInvestmentImportTypes'

const INVESTMENT_SUFFIX = '-investment'

const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(segment => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ')

const normalizeInvestmentGroupCode = (value: string): string =>
  value.trim().replace(/-/g, '_').replace(/\s+/g, '_').toUpperCase()

const toInvestmentTabId = (groupCode: string): string =>
  normalizeInvestmentGroupCode(groupCode).toLowerCase().replace(/_/g, '-')

const toInvestmentEntityType = (groupCode: string): string => {
  const tabId = toInvestmentTabId(groupCode)
  return tabId.endsWith(INVESTMENT_SUFFIX) ? tabId : `${tabId}${INVESTMENT_SUFFIX}`
}

export const toInvestmentPayloadKey = (groupCode: string): string => {
  const normalizedGroup = normalizeInvestmentGroupCode(groupCode).replace(/_INVESTMENT$/, '')
  const words = normalizedGroup.toLowerCase().split('_').filter(Boolean)
  const camelCase = words
    .map((word, index) => (index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join('')

  return camelCase ? `${camelCase}Investment` : 'investment'
}

const toInvestmentGroupLabel = (entry: Pick<CatalogEntry, 'value' | 'code' | 'id'>): string => {
  if (entry.value && entry.value.trim().length > 0) return entry.value.trim()
  if (entry.code && entry.code.trim().length > 0) return toTitleCase(normalizeInvestmentGroupCode(entry.code))
  return entry.id
}

export const toInvestmentEntryLabel = (groupLabel: string): string =>
  /investment/i.test(groupLabel) ? groupLabel : `${groupLabel} Investments`

const byDisplayOrderThenLabel = (a: CatalogEntry, b: CatalogEntry): number => {
  const aOrder = a.displayOrder ?? Number.MAX_SAFE_INTEGER
  const bOrder = b.displayOrder ?? Number.MAX_SAFE_INTEGER
  if (aOrder !== bOrder) return aOrder - bOrder
  return toInvestmentGroupLabel(a).localeCompare(toInvestmentGroupLabel(b), undefined, { sensitivity: 'base' })
}

export const toInvestmentImportGroupDescriptors = (entries: CatalogEntry[]): InvestmentImportGroupDescriptor[] =>
  [...entries].sort(byDisplayOrderThenLabel).map(entry => {
    const normalizedCode = normalizeInvestmentGroupCode(entry.code || entry.value || entry.id)
    return {
      id: entry.id,
      code: normalizedCode,
      label: toInvestmentGroupLabel(entry),
      tabId: toInvestmentTabId(normalizedCode),
      entityType: toInvestmentEntityType(normalizedCode)
    }
  })
