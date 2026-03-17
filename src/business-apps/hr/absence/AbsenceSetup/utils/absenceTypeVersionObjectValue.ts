import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { JSONObject, JSONValue } from '@/common/types/i18nTypes'
import type { AbsenceTypeVersionFormValues } from './absenceSetup'

interface AbsenceTypeVersionObjectValue extends JSONObject {
  version?: string
  validFrom?: string
  validTo?: string
  colorToken?: string
  measurement?: string
  behaviour?: string
  priority?: number
  enteredBy?: string
  substitute?: boolean
  relative?: boolean
  document?: boolean
  anonymous?: boolean
  halfDays?: boolean
  accessPlan?: boolean
  accessRequest?: boolean
  absenceTypeCode?: string
}

const isObjectRecord = (value: JSONValue | undefined): value is AbsenceTypeVersionObjectValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toStringValue = (value: JSONValue | undefined, fallback: string): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

const toBooleanValue = (value: JSONValue | undefined, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const sanitizeVersionCode = (value: string) => value.trim().replaceAll(/[^a-zA-Z0-9_-]+/g, '-')

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

  return {
    code: getAbsenceTypeCodeForVersion(entry),
    version: toStringValue(objectValue.version, defaultValues.version),
    validFrom: toStringValue(objectValue.validFrom, defaultValues.validFrom),
    validTo: toStringValue(objectValue.validTo, defaultValues.validTo),
    colorToken: toStringValue(objectValue.colorToken, defaultValues.colorToken),
    measurement: toStringValue(objectValue.measurement, defaultValues.measurement),
    behaviour: toStringValue(objectValue.behaviour, defaultValues.behaviour),
    priority: toStringValue(objectValue.priority, defaultValues.priority),
    enteredBy: toStringValue(objectValue.enteredBy, defaultValues.enteredBy),
    substitute: toBooleanValue(objectValue.substitute, defaultValues.substitute),
    relative: toBooleanValue(objectValue.relative, defaultValues.relative),
    document: toBooleanValue(objectValue.document, defaultValues.document),
    anonymous: toBooleanValue(objectValue.anonymous, defaultValues.anonymous),
    halfDays: toBooleanValue(objectValue.halfDays, defaultValues.halfDays),
    accessPlan: toBooleanValue(objectValue.accessPlan, defaultValues.accessPlan),
    accessRequest: toBooleanValue(objectValue.accessRequest, defaultValues.accessRequest)
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
    objectValue: {
      version: formValues.version,
      validFrom: formValues.validFrom,
      validTo: formValues.validTo,
      colorToken: formValues.colorToken,
      measurement: formValues.measurement,
      behaviour: formValues.behaviour,
      priority: Number(formValues.priority || 0),
      enteredBy: formValues.enteredBy,
      substitute: formValues.substitute,
      relative: formValues.relative,
      document: formValues.document,
      anonymous: formValues.anonymous,
      halfDays: formValues.halfDays,
      accessPlan: formValues.accessPlan,
      accessRequest: formValues.accessRequest,
      absenceTypeCode: formValues.code
    },
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
