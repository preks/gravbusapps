import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
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

export const isAbsenceTypeVersionActive = (entry: CatalogEntry): boolean => {
  const objectValue = isObjectRecord(entry.objectValue) ? entry.objectValue : {}
  const validFromDate = parseDateValue(toStringValue(objectValue.validFrom, ''))
  const validToDate = parseDateValue(toStringValue(objectValue.validTo, ''))
  const today = getTodayAtStart()

  if (validFromDate && validFromDate > today) {
    return false
  }

  if (validToDate && validToDate < today) {
    return false
  }

  return true
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

  return selectedType?.value || selectedType?.code || entry.value || absenceTypeCode || fallbackTitle
}

export const getAbsenceTypeCodeForVersion = (entry?: CatalogEntry): string => {
  const objectValue = isObjectRecord(entry?.objectValue) ? entry?.objectValue : undefined
  const parentCode = entry?.parentEntryId?.split(':').pop()?.trim()

  if (typeof objectValue?.absenceTypeCode === 'string' && objectValue.absenceTypeCode) {
    return objectValue.absenceTypeCode
  }

  if (parentCode) {
    return parentCode
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

  return {
    code: getAbsenceTypeCodeForVersion(entry),
    version: toStringValue(objectValue.version, defaultValues.version),
    validFrom: toStringValue(objectValue.validFrom, defaultValues.validFrom),
    validTo: toStringValue(objectValue.validTo, defaultValues.validTo),
    settings
  }
}

export const buildAbsenceTypeVersionPayload = (
  formValues: AbsenceTypeVersionFormValues,
  absenceTypes: AbsenceType[]
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
  const value = `${selectedType?.value || formValues.code} ${formValues.version}`.trim()

  return {
    code,
    value,
    parentEntryId: formValues.code ? `AbsenceType:v1:${formValues.code}` : '',
    objectValue: buildAbsenceTypeObjectValue(formValues.settings, {
      version: formValues.version,
      validFrom: formValues.validFrom,
      validTo: formValues.validTo
    }),
    translations: []
  }
}

export const getAbsenceTypeVersionDescription = (entry: CatalogEntry): string => {
  const objectValue = isObjectRecord(entry.objectValue) ? entry.objectValue : {}
  const version = toStringValue(objectValue.version, entry.code)
  const validFrom = toStringValue(objectValue.validFrom, '')
  const validTo = toStringValue(objectValue.validTo, '')
  const dateRange = validFrom || validTo ? [validFrom, validTo].filter(Boolean).join(' - ') : ''

  return dateRange ? `${version} | ${dateRange}` : version
}
