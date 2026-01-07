/**
 * Common GraphQL fragments for reuse across entities
 * Simple fragments for common patterns
 */

// ==========================================
// BASIC FRAGMENTS
// ==========================================

/**
 * Complete audit fields including lifecycle tracking
 */
export const AUDIT_FIELDS = `
  createdAt
  createdBy
  updatedAt
  updatedBy
  isDeleted
  recordState
  activeFrom
  activeTo
  version
`

/**
 * Catalog entry with translations
 */
export const CATALOG_ENTRY = `
  id
  code
  alternativeCode
  value
  additionalValue1
  additionalValue2
  additionalValue3
  type
  objectValue
  catalogId
  parentEntryId
  displayOrder
  isDeleted
  createdAt
  createdBy
  recordState
  activeFrom
  activeTo
  translations {
    id
    localeCode
    value
    additionalValue1
    additionalValue2
    additionalValue3
    objectValue
  }
`
