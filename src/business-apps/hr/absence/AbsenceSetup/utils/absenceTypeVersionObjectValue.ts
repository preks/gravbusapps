import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import { getCatalogTranslationValues } from '@/business-apps/hr/core/utils/catalogEntryHelpers'
import type { JSONObject, JSONValue } from '@/common/types/i18nTypes'
import type { AbsenceTypeVersionFormValues } from './absenceSetup'
import { buildAbsenceTypeObjectValue, getAbsenceTypeObjectEditorState } from './absenceTypeObjectValue'

interface AbsenceTypeVersionObjectValue extends JSONObject {
  version?: string
  validFrom?: string
  validTo?: string
}

const isObjectRecord = (value: JSONValue | undefined): value is AbsenceTypeVersionObjectValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toStringValue = (value: JSONValue | undefined, fallback: string): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

export const formatAbsenceTypeVersionDisplayDate = (value: string): string => {
  const parsedDate = parseDateValue(value)
  if (!parsedDate) {
    return value
  }

  const day = `${parsedDate.getDate()}`.padStart(2, '0')
  const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0')
  const year = parsedDate.getFullYear()

  return `${day}.${month}.${year}`
}

const sanitizeVersionCode = (value: string) => value.trim().replaceAll(/[^a-zA-Z0-9_-]+/g, '-')

const parseDateValue = (value: string): Date | null => {
  if (!value) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (/^\d{2}[/.]\d{2}[/.]\d{4}$/.test(value)) {
    const normalizedValue = value.replaceAll('.', '/')
    const [day, month, year] = normalizedValue.split('/')
    const parsed = new Date(`${year}-${month}-${day}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getTodayAtStart = () => {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

export const isActiveByValidTo = (validTo: string | undefined | null): boolean => {
  if (!validTo) return true
  const date = parseDateValue(validTo)
  if (!date) return true
  return date >= getTodayAtStart()
}

export const isAbsenceTypeVersionActive = (entry: CatalogEntry): boolean => {
  const objectValue = isObjectRecord(entry.objectValue) ? entry.objectValue : {}
  return isActiveByValidTo(toStringValue(objectValue.validTo, ''))
}

export const canEditAbsenceTypeVersion = (entry: CatalogEntry): boolean => {
  const objectValue = isObjectRecord(entry.objectValue) ? entry.objectValue : {}
  const validToDate = parseDateValue(toStringValue(objectValue.validTo, ''))
  const today = getTodayAtStart()

  if (validToDate && validToDate < today) {
    return false
  }

  return true
}

export const getAbsenceTypeVersionSortValue = (entry: CatalogEntry): number => {
  const objectValue = isObjectRecord(entry.objectValue) ? entry.objectValue : {}
  const validFromDate = parseDateValue(toStringValue(objectValue.validFrom, ''))
  const validToDate = parseDateValue(toStringValue(objectValue.validTo, ''))

  return validFromDate?.getTime() || validToDate?.getTime() || 0
}

export const getAbsenceTypeVersionTitle = (
  entry: CatalogEntry,
  absenceTypes: AbsenceType[],
  fallbackTitle: string
): string => {
  const absenceTypeCode = getAbsenceTypeCodeForVersion(entry)
  const selectedType = absenceTypes.find(item => item.code === absenceTypeCode)

  return entry.value || selectedType?.value || selectedType?.code || absenceTypeCode || fallbackTitle
}

export const getAbsenceTypeCodeForVersion = (entry?: CatalogEntry): string => {
  const objectValue = isObjectRecord(entry?.objectValue) ? entry?.objectValue : undefined
  const parentCode = entry?.parentEntryId?.split(':').pop()?.trim()

  if (parentCode) {
    return parentCode
  }

  if (typeof objectValue?.absenceTypeCode === 'string' && objectValue.absenceTypeCode) {
    return objectValue.absenceTypeCode
  }

  return entry?.code.split('-')[0] || ''
}

export const getAbsenceTypeVersionFormValues = (
  entry: CatalogEntry | null | undefined,
  defaultValues: AbsenceTypeVersionFormValues
): AbsenceTypeVersionFormValues => {
  if (!entry) {
    return defaultValues
  }

  const objectValue = isObjectRecord(entry.objectValue) ? entry.objectValue : {}
  const { settings } = getAbsenceTypeObjectEditorState(entry.objectValue)
  const translationValues = getCatalogTranslationValues(entry)

  // If the en-US translation came back empty but the entry has a value, use it as fallback.
  // This happens when the entry was fetched under a non-en-US locale.
  const enUS = translationValues.enUS || entry.value || ''

  return {
    code: getAbsenceTypeCodeForVersion(entry),
    version: toStringValue(objectValue.version, defaultValues.version),
    validFrom: toStringValue(objectValue.validFrom, defaultValues.validFrom),
    validTo: toStringValue(objectValue.validTo, defaultValues.validTo),
    translations: { ...translationValues, enUS },
    settings
  }
}

const buildAbsenceTypeVersionTranslations = (
  formValues: AbsenceTypeVersionFormValues,
  fallbackValue: string,
  includeEmptyTranslations: boolean
): CatalogEntry['translations'] => {
  const translations: CatalogEntry['translations'] = [
    { localeCode: 'en-US', value: formValues.translations.enUS.trim() || fallbackValue },
    { localeCode: 'de-DE', value: formValues.translations.deDE.trim() },
    { localeCode: 'ro-RO', value: formValues.translations.roRO.trim() }
  ]

  return includeEmptyTranslations ? translations : translations.filter(item => item.value)
}

export const buildAbsenceTypeVersionPayload = (
  formValues: AbsenceTypeVersionFormValues,
  absenceTypes: AbsenceType[],
  includeEmptyTranslations = false
): {
  code: string
  value: string
  parentEntryId: string
  objectValue: AbsenceTypeVersionObjectValue
  translations: CatalogEntry['translations']
} => {
  const selectedType = absenceTypes.find(item => item.code === formValues.code)
  const versionCode = sanitizeVersionCode(formValues.version || 'version')
  const code = `${formValues.code}-${versionCode}`
  const fallbackValue = `${selectedType?.value || formValues.code} ${formValues.version}`.trim()
  const value = formValues.translations.enUS.trim() || fallbackValue

  return {
    code,
    value,
    parentEntryId: formValues.code ? `AbsenceType:v1:${formValues.code}` : '',
    objectValue: buildAbsenceTypeObjectValue(formValues.settings, {
      version: formValues.version,
      validFrom: formValues.validFrom,
      validTo: formValues.validTo
    }),
    translations: buildAbsenceTypeVersionTranslations(formValues, fallbackValue, includeEmptyTranslations)
  }
}

export const getAbsenceTypeVersionDescription = (entry: CatalogEntry): string => {
  const objectValue = isObjectRecord(entry.objectValue) ? entry.objectValue : {}
  const version = toStringValue(objectValue.version, entry.code)
  const validFrom = toStringValue(objectValue.validFrom, '')
  const validTo = toStringValue(objectValue.validTo, '')
  const dateRange =
    validFrom || validTo
      ? [formatAbsenceTypeVersionDisplayDate(validFrom), formatAbsenceTypeVersionDisplayDate(validTo)]
          .filter(Boolean)
          .join(' - ')
      : ''

  return dateRange ? `${version} | ${dateRange}` : version
}
