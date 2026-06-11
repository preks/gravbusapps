import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { JSONObject } from '@/common/types/i18nTypes'

/** JSON stored in contract type catalog entry `additionalValue2`. */
export type ContractTypeAdditionalJson = {
  value?: number | null
  unit?: string
}

export type ContractTypeObjectValue = JSONObject & {
  payroll_relevant?: boolean
  time_relevant?: boolean
}

export function parseContractTypeJson(additionalValue2?: string): ContractTypeAdditionalJson {
  if (!additionalValue2?.trim()) return {}
  try {
    const parsed = JSON.parse(additionalValue2) as Record<string, unknown>
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        value: typeof parsed.value === 'number' ? parsed.value : null,
        unit: typeof parsed.unit === 'string' ? parsed.unit : ''
      }
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function asCatalogObjectValue(objectValue?: CatalogEntry['objectValue']): JSONObject {
  if (objectValue && typeof objectValue === 'object' && !Array.isArray(objectValue)) {
    return objectValue as JSONObject
  }
  return {}
}

export function getContractTypeObjectValue(entry: {
  objectValue?: CatalogEntry['objectValue']
}): ContractTypeObjectValue {
  const objectValue = asCatalogObjectValue(entry.objectValue)
  return {
    ...objectValue,
    payroll_relevant: objectValue.payroll_relevant === true,
    time_relevant: objectValue.time_relevant === true
  }
}

function getContractTypeBooleanFlag(
  entry: { objectValue?: CatalogEntry['objectValue'] },
  key: keyof ContractTypeObjectValue
): boolean {
  return asCatalogObjectValue(entry.objectValue)[key] === true
}

export function getContractTypePayrollRelevant(entry: { objectValue?: CatalogEntry['objectValue'] }): boolean {
  return getContractTypeBooleanFlag(entry, 'payroll_relevant')
}

export function getContractTypeTimeRelevant(entry: { objectValue?: CatalogEntry['objectValue'] }): boolean {
  return getContractTypeBooleanFlag(entry, 'time_relevant')
}

export function isEmploymentTypeMarkedDeleted(entry: { isDeleted?: boolean }): boolean {
  return entry.isDeleted === true
}

export function isContractTypeMarkedDeleted(entry: { isDeleted?: boolean }): boolean {
  return entry.isDeleted === true
}

export function serializeContractTypeAdditionalJson(meta: Pick<ContractTypeAdditionalJson, 'value' | 'unit'>): string {
  const out: Record<string, unknown> = {}
  if (meta.value != null && typeof meta.value === 'number' && meta.unit != null && String(meta.unit).trim() !== '') {
    out.value = meta.value
    out.unit = meta.unit
  }
  return JSON.stringify(out)
}

export function formatProbationFromJson(
  additionalValue2?: string,
  unitLabels: Record<'day' | 'week' | 'month', string> = {
    day: 'Day(s)',
    week: 'Week(s)',
    month: 'Month(s)'
  }
): string {
  const { value, unit } = parseContractTypeJson(additionalValue2)
  if (value == null || !unit) return '-'
  const unitLabel = unitLabels[unit as 'day' | 'week' | 'month'] ?? unit
  return `${value} ${unitLabel}`
}

/**
 * Catalog PUT requires a full entry shape; `id` + `code` + reference fields must match GET.
 * PATCH is not supported on `/catalog-entries/{id}` — merge fresh GET with outgoing edits.
 */
/**
 * List queries use `localeCode`; the API may resolve `value` from `translations` for that locale.
 * After editing the display name, upsert the row for `localeCode` so list + forms stay in sync.
 */
export function upsertCatalogTranslationForLocale(
  translations: CatalogEntry['translations'] | undefined,
  localeCode: string,
  patch: { value?: string; additionalValue1?: string }
): NonNullable<CatalogEntry['translations']> {
  const list = Array.isArray(translations) ? [...translations] : []
  const idx = list.findIndex(t => t.localeCode === localeCode)
  if (idx >= 0) {
    list[idx] = { ...list[idx], localeCode, ...patch }
  } else {
    list.push({ localeCode, ...patch })
  }
  return list
}

export function mergeCatalogEntryForPut(
  existing: CatalogEntry,
  overrides: Partial<
    Pick<
      CatalogEntry,
      | 'value'
      | 'additionalValue1'
      | 'additionalValue2'
      | 'additionalValue3'
      | 'parentEntryId'
      | 'objectValue'
      | 'isDeleted'
      | 'translations'
    >
  >
): Record<string, unknown> {
  return {
    id: existing.id,
    code: existing.code,
    alternativeCode: existing.alternativeCode,
    type: existing.type,
    displayOrder: existing.displayOrder,
    localeCode: existing.localeCode,
    value: overrides.value ?? existing.value,
    additionalValue1: overrides.additionalValue1 ?? existing.additionalValue1,
    additionalValue2: overrides.additionalValue2 ?? existing.additionalValue2,
    additionalValue3: overrides.additionalValue3 ?? existing.additionalValue3,
    objectValue: overrides.objectValue !== undefined ? overrides.objectValue : existing.objectValue,
    isDeleted: overrides.isDeleted ?? existing.isDeleted,
    parentEntryId: overrides.parentEntryId ?? existing.parentEntryId,
    translations: overrides.translations !== undefined ? overrides.translations : (existing.translations ?? [])
  }
}
