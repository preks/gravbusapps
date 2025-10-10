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

// Base catalog entry reference (minimal fields)
export const CATALOG_ENTRY_REF = `
  id
  code
  value
  alternativeCode
  description
  additionalValue1
  additionalValue2
  additionalValue3
  translations {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }
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
