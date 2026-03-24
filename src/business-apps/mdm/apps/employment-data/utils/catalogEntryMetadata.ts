import type { CatalogEntry } from '@/common/types/CatalogTypes'

/** JSON stored in employment type catalog entry `additionalValue2`. */
export type EmploymentTypeMetadata = {
  is_deleted?: boolean
}

/** JSON stored in contract type catalog entry `additionalValue2` (probation + flags). */
export type ContractTypeAdditionalJson = {
  value?: number | null
  unit?: string
  payroll_relevant?: boolean
  is_deleted?: boolean
}

export function parseEmploymentMetadata(additionalValue2?: string): EmploymentTypeMetadata {
  if (!additionalValue2?.trim()) return {}
  try {
    const parsed = JSON.parse(additionalValue2) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { is_deleted: (parsed as EmploymentTypeMetadata).is_deleted === true }
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function parseContractTypeJson(additionalValue2?: string): ContractTypeAdditionalJson {
  if (!additionalValue2?.trim()) return {}
  try {
    const parsed = JSON.parse(additionalValue2) as Record<string, unknown>
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        value: typeof parsed.value === 'number' ? parsed.value : null,
        unit: typeof parsed.unit === 'string' ? parsed.unit : '',
        payroll_relevant: parsed.payroll_relevant === true,
        is_deleted: parsed.is_deleted === true
      }
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function serializeContractTypeAdditionalJson(meta: ContractTypeAdditionalJson): string {
  const out: Record<string, unknown> = {
    payroll_relevant: meta.payroll_relevant === true,
    is_deleted: meta.is_deleted === true
  }
  if (meta.value != null && typeof meta.value === 'number' && meta.unit != null && String(meta.unit).trim() !== '') {
    out.value = meta.value
    out.unit = meta.unit
  }
  return JSON.stringify(out)
}

export function formatProbationFromJson(additionalValue2?: string): string {
  const { value, unit } = parseContractTypeJson(additionalValue2)
  if (value == null || !unit) return '-'
  const unitLabel = unit === 'day' ? 'Day(s)' : unit === 'week' ? 'Week(s)' : 'Month(s)'
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
    Pick<CatalogEntry, 'value' | 'additionalValue1' | 'additionalValue2' | 'additionalValue3' | 'translations'>
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
    objectValue: existing.objectValue,
    parentEntryId: existing.parentEntryId,
    translations: overrides.translations !== undefined ? overrides.translations : (existing.translations ?? [])
  }
}
