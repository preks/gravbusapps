import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { CatalogEntry, CatalogEntryTranslation } from '../types/catalogTypes'

/**
 * Translatable fields in a CatalogEntry
 */
export type TranslatableField = 'value' | 'additionalValue1' | 'additionalValue2' | 'additionalValue3' | 'objectValue'

// Helper functions to reduce cognitive complexity
const findTranslation = (
  entry: CatalogEntry,
  field: TranslatableField,
  normalizedLocale: string
): CatalogEntryTranslation | null => {
  if (!Array.isArray(entry.translations) || entry.translations.length === 0) {
    return null
  }

  return (
    entry.translations.find((t: CatalogEntryTranslation) => t?.localeCode?.toLowerCase() === normalizedLocale) || null
  )
}

const formatFieldValue = (value: any, field: TranslatableField): string => {
  if (value === null || value === undefined) return ''

  if (field === 'objectValue') {
    return typeof value === 'string' ? value : JSON.stringify(value)
  }

  return String(value)
}

const getTranslatedValue = (
  translation: CatalogEntryTranslation | null,
  field: TranslatableField,
  debug?: boolean
): string | null => {
  if (!translation?.[field]) return null

  const translatedValue = translation[field]

  if (typeof translatedValue === 'string' && translatedValue.trim() !== '') {
    if (debug) console.log('[getCatalogEntryField] Using translated value:', translatedValue)
    return translatedValue
  }

  if (field === 'objectValue' && translatedValue !== null && translatedValue !== undefined) {
    return formatFieldValue(translatedValue, field)
  }

  return null
}

/**
 * Gets the value for any field in a catalog entry with locale support.
 *
 * Priority:
 * 1. Translation for current locale (if exists and not empty)
 * 2. Default field value (fallback)
 *
 * @param entry - The catalog entry
 * @param field - The field to get (default: 'value')
 * @param locale - Optional locale override (defaults to current user locale)
 * @returns Field value (localized if translation exists)
 *
 * @example
 * ```typescript
 * const entry = await getCatalogEntry('ContentGroup:v1:NEWS')
 * const displayName = getCatalogEntryField(entry, 'value') // "News" or "Nachrichten"
 * const description = getCatalogEntryField(entry, 'additionalValue1')
 * ```
 */
export function getCatalogEntryField(
  entry: CatalogEntry | null | undefined,
  field: TranslatableField = 'value',
  locale?: string,
  debug?: boolean
): string {
  if (!entry) return ''

  try {
    const targetLocale = locale || getCurrentActiveUserLocale()
    const normalizedLocale = targetLocale.toLowerCase()

    if (debug) {
      console.log('[getCatalogEntryField] DEBUG:', {
        catalogId: entry.catalogId,
        code: entry.code,
        field,
        targetLocale,
        normalizedLocale,
        hasTranslations: Array.isArray(entry.translations),
        translationsCount: entry.translations?.length || 0
      })
    }

    const translation = findTranslation(entry, field, normalizedLocale)
    if (debug && translation) {
      console.log('[getCatalogEntryField] Found translation:', {
        localeCode: translation.localeCode,
        translatedValue: translation[field]
      })
    }

    const translatedValue = getTranslatedValue(translation, field, debug)
    if (translatedValue !== null) {
      return translatedValue
    }

    const defaultValue = entry[field]
    if (debug) console.log('[getCatalogEntryField] Using default value:', defaultValue)

    return formatFieldValue(defaultValue, field)
  } catch (error) {
    console.error('[getCatalogEntryField] Error getting translated field:', error)
    const fallback = entry[field]
    return fallback ? String(fallback) : ''
  }
}

/**
 * Convenience function to get the main display value ('value' field)
 *
 * @param entry - The catalog entry
 * @param locale - Optional locale override
 * @returns Display value (localized if translation exists)
 *
 * @example
 * ```typescript
 * const displayName = getCatalogEntryValue(catalogEntry) // Most common use case
 * ```
 */
export function getCatalogEntryValue(entry: CatalogEntry | null | undefined, locale?: string, debug?: boolean): string {
  return getCatalogEntryField(entry, 'value', locale, debug)
}

/**
 * Gets multiple fields at once from a catalog entry
 * Useful when you need several fields from the same entry
 *
 * @param entry - The catalog entry
 * @param fields - Array of fields to get
 * @param locale - Optional locale override
 * @returns Object with values for each field (localized if translations exist)
 *
 * @example
 * ```typescript
 * const { value, additionalValue1 } = getCatalogEntryFields(entry, ['value', 'additionalValue1'])
 * ```
 */
export function getCatalogEntryFields(
  entry: CatalogEntry | null | undefined,
  fields: TranslatableField[],
  locale?: string
): Record<TranslatableField, string> {
  const result: Partial<Record<TranslatableField, string>> = {}

  fields.forEach(field => {
    result[field] = getCatalogEntryField(entry, field, locale)
  })

  return result as Record<TranslatableField, string>
}

/**
 * Creates a GraphQL sort path for catalog entry fields
 *
 * @param fieldName - The base field name (e.g., 'type', 'priority', 'status')
 * @param catalogFieldMapping - Optional mapping for domain-specific naming (e.g., { type: 'taskType' })
 * @returns GraphQL sort path (e.g., 'type.value' or 'taskType.value')
 *
 * @example
 * // CRM (uses original field names)
 * getCatalogEntrySortPath('type') // Returns: 'type.value'
 * getCatalogEntrySortPath('priority') // Returns: 'priority.value'
 *
 * @example
 * // IRM (uses domain-specific field names)
 * const irmMapping = { type: 'taskType', priority: 'taskPriority', status: 'taskStatus' }
 * getCatalogEntrySortPath('type', irmMapping) // Returns: 'taskType.value'
 * getCatalogEntrySortPath('priority', irmMapping) // Returns: 'taskPriority.value'
 */
export function getCatalogEntrySortPath(fieldName: string, catalogFieldMapping?: Record<string, string>): string {
  const mappedFieldName = catalogFieldMapping?.[fieldName] || fieldName
  return `${mappedFieldName}.value`
}

/**
 * Creates a complete column-to-GraphQL field mapping including catalog entries
 *
 * @param baseMapping - Scalar field mappings (e.g., { name: 'name', createdAt: 'createdAt' })
 * @param catalogColumns - Catalog entry column names to include (e.g., ['type', 'priority', 'status'])
 * @param catalogFieldMapping - Optional domain-specific catalog field name mapping
 * @param employeeColumns - Optional employee column mappings (e.g., { assignedTo: 'assignedEmployee', createdBy: 'creatorEmployee' })
 * @returns Complete column-to-GraphQL mapping object
 *
 * @example
 * // CRM mapping
 * const crmMapping = createColumnToGraphQLMapping(
 *   { name: 'name', dueDate: 'dueDate', createdAt: 'createdAt' },
 *   ['type', 'priority', 'status'],
 *   undefined, // No field name mapping needed for CRM
 *   { assignedTo: 'assignedEmployee', createdBy: 'creatorEmployee' }
 * )
 * // Result: {
 * //   name: 'name',
 * //   dueDate: 'dueDate',
 * //   createdAt: 'createdAt',
 * //   type: 'type.value',
 * //   priority: 'priority.value',
 * //   status: 'status.value',
 * //   assignedTo: 'assignedEmployee.displayName',
 * //   createdBy: 'creatorEmployee.displayName'
 * // }
 *
 * @example
 * // IRM mapping
 * const irmMapping = createColumnToGraphQLMapping(
 *   { name: 'name', dueDate: 'dueDate', createdAt: 'createdAt' },
 *   ['type', 'priority', 'status'],
 *   { type: 'taskType', priority: 'taskPriority', status: 'taskStatus' },
 *   { assignedTo: 'assignedEmployee', createdBy: 'creatorEmployee' }
 * )
 * // Result: {
 * //   name: 'name',
 * //   dueDate: 'dueDate',
 * //   createdAt: 'createdAt',
 * //   type: 'taskType.value',
 * //   priority: 'taskPriority.value',
 * //   status: 'taskStatus.value',
 * //   assignedTo: 'assignedEmployee.displayName',
 * //   createdBy: 'creatorEmployee.displayName'
 * // }
 */
export function createColumnToGraphQLMapping(
  baseMapping: Record<string, string>,
  catalogColumns: string[] = [],
  catalogFieldMapping?: Record<string, string>,
  employeeColumns?: Record<string, string>
): Record<string, string> {
  const mapping: Record<string, string> = { ...baseMapping }

  // Add catalog entry columns with .value suffix
  catalogColumns.forEach(columnName => {
    mapping[columnName] = getCatalogEntrySortPath(columnName, catalogFieldMapping)
  })

  // Add employee columns with .displayName suffix
  if (employeeColumns) {
    Object.entries(employeeColumns).forEach(([columnName, fieldName]) => {
      mapping[columnName] = `${fieldName}.displayName`
    })
  }

  return mapping
}
