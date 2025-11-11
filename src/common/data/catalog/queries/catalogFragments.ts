/**
 * GraphQL Fragments for Catalog Management
 * Structured like REST API responses with conditional includes
 */

// Common audit fields
export const CATALOG_AUDIT_FIELDS = `
  createdAt
  createdBy
  updatedAt
  updatedBy
`

// Base catalog reference (minimal fields)
export const CATALOG_REF = `
  id
  identifier
  version
  name
  description
  defaultLocale
  schemaDefinition
  parentId
  isDeleted
  recordState
  validFrom
  validTo
  ${CATALOG_AUDIT_FIELDS}
`

/**
 * Get catalog entry reference fragment with optional locale filtering
 * @param localeCode - Optional locale code to filter translations. If provided, only returns translation for that locale.
 *                     If not provided, returns all translations (for backward compatibility)
 */
export const getCatalogEntryRef = (localeCode?: string): string => {
  const translationsFragment = localeCode
    ? `translations(where: { localeCode: { _eq: "${localeCode}" } }) {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }`
    : `translations {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }`

  return `
  id
  code
  value
  alternativeCode
  description
  additionalValue1
  additionalValue2
  additionalValue3
  ${translationsFragment}
  type
  displayOrder
  objectValue
  activeFrom
  activeTo
  catalogId
  parentEntryId
  isDeleted
  recordState
  ${CATALOG_AUDIT_FIELDS}
`
}

// Base catalog entry reference (minimal fields) - backward compatibility (all translations)
export const CATALOG_ENTRY_REF = getCatalogEntryRef()

// Parent catalog entry fragment (for conditional include)
export const PARENT_CATALOG_ENTRY = `
  parentEntry {
    ${CATALOG_ENTRY_REF}
    catalog {
      ${CATALOG_REF}
    }
  }
`

// Child catalog entries fragment (for conditional include)
export const CHILD_CATALOG_ENTRIES = `
  childEntries {
    ${CATALOG_ENTRY_REF}
    catalog {
      ${CATALOG_REF}
    }
  }
`
