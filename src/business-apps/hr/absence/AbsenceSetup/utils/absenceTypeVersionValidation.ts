import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceTypeVersionFormValues } from './absenceSetup'
import { getAbsenceTypeCodeForVersion } from './absenceTypeVersionObjectValue'

export interface AbsenceTypeVersionValidationErrors {
  absenceType?: string
  version?: string
  validFrom?: string
  validTo?: string
}

const normalizeDateValue = (value: string): string => {
  if (!value) {
    return ''
  }

  if (value.includes('T')) {
    const isoDatePart = value.split('T')[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDatePart)) {
      return isoDatePart
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    const [day, month, year] = value.split('.')
    return `${year}-${month}-${day}`
  }

  return value
}

const toTimestamp = (value: string, fallback: number) => {
  const normalizedDate = normalizeDateValue(value)
  if (!normalizedDate) {
    return fallback
  }

  const parsedDate = new Date(`${normalizedDate}T00:00:00`)
  return Number.isNaN(parsedDate.getTime()) ? fallback : parsedDate.getTime()
}

const getVersionValue = (entry: CatalogEntry) => {
  const objectValue = entry.objectValue
  if (
    objectValue &&
    typeof objectValue === 'object' &&
    !Array.isArray(objectValue) &&
    typeof objectValue.version === 'string'
  ) {
    return objectValue.version
  }

  return ''
}

const rangesOverlap = (leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) => {
  const leftStartTs = toTimestamp(leftStart, Number.NEGATIVE_INFINITY)
  const leftEndTs = toTimestamp(leftEnd, Number.POSITIVE_INFINITY)
  const rightStartTs = toTimestamp(rightStart, Number.NEGATIVE_INFINITY)
  const rightEndTs = toTimestamp(rightEnd, Number.POSITIVE_INFINITY)

  return leftStartTs <= rightEndTs && rightStartTs <= leftEndTs
}

export const getFirstDayOfCurrentMonthIso = () => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const year = firstDay.getFullYear()
  const month = `${firstDay.getMonth() + 1}`.padStart(2, '0')
  const day = `${firstDay.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const validateAbsenceTypeVersion = ({
  values,
  entries,
  currentEntryId
}: {
  values: AbsenceTypeVersionFormValues
  entries: CatalogEntry[]
  currentEntryId?: string
}): AbsenceTypeVersionValidationErrors => {
  const errors: AbsenceTypeVersionValidationErrors = {}
  const normalizedVersion = values.version.trim().toLowerCase()

  if (!values.code.trim()) {
    errors.absenceType = 'validation-absence-type-required'
  }

  if (!values.version.trim()) {
    errors.version = 'validation-version-required'
  }

  if (values.validFrom && values.validTo && toTimestamp(values.validFrom, 0) > toTimestamp(values.validTo, 0)) {
    errors.validTo = 'validation-valid-to-before-valid-from'
  }

  if (!values.code.trim() || !normalizedVersion) {
    return errors
  }

  const relatedEntries = entries.filter(
    entry => entry.id !== currentEntryId && getAbsenceTypeCodeForVersion(entry) === values.code
  )

  const duplicateVersion = relatedEntries.some(
    entry => getVersionValue(entry).trim().toLowerCase() === normalizedVersion
  )
  if (duplicateVersion) {
    errors.version = 'validation-duplicate-version'
  }

  const overlappingVersion = relatedEntries.find(entry => {
    const objectValue = entry.objectValue
    const validFrom =
      objectValue &&
      typeof objectValue === 'object' &&
      !Array.isArray(objectValue) &&
      typeof objectValue.validFrom === 'string'
        ? objectValue.validFrom
        : ''
    const validTo =
      objectValue &&
      typeof objectValue === 'object' &&
      !Array.isArray(objectValue) &&
      typeof objectValue.validTo === 'string'
        ? objectValue.validTo
        : ''

    return rangesOverlap(values.validFrom, values.validTo, validFrom, validTo)
  })

  if (overlappingVersion && !errors.validFrom && !errors.validTo) {
    errors.validFrom = 'validation-overlapping-version-dates'
    errors.validTo = 'validation-overlapping-version-dates'
  }

  return errors
}
