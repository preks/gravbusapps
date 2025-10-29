/**
 * GraphQL Fragments for Content Queries
 * Reusable fragments for consistent data fetching
 */

/**
 * Employee reference fragment
 */
export const EMPLOYEE_REF_FRAGMENT = `
  id
  code
  firstName
  lastName
  displayName
  email
  picture
  pictureThumbnail
`

/**
 * Catalog entry fragment
 */
export const CATALOG_ENTRY_FRAGMENT = `
  id
  catalogIdentifier
  version
  key
  value
  sortOrder
  isActive
`

/**
 * Content entry core fields
 */
export const CONTENT_ENTRY_CORE_FRAGMENT = `
  id
  parentContentId
  title
  preview
  content
  picture
  pictureThumbnail
  timeToRead
  creatorEmployeeId
  updaterEmployeeId
  displayCreator
  displayUpdater
  allowComment
  allowReaction
  role
  contentGroupRef
  contentTypeRef
  recordVersion
  recordState
  createdAt
  createdBy
  updatedAt
  updatedBy
  isDeleted
`

/**
 * Content entry with employee references
 */
export const CONTENT_ENTRY_WITH_EMPLOYEES_FRAGMENT = `
  ${CONTENT_ENTRY_CORE_FRAGMENT}
  creatorEmployee {
    ${EMPLOYEE_REF_FRAGMENT}
  }
  updaterEmployee {
    ${EMPLOYEE_REF_FRAGMENT}
  }
`

/**
 * Content entry with catalog references
 */
export const CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT = `
  ${CONTENT_ENTRY_WITH_EMPLOYEES_FRAGMENT}
  contentGroup {
    ${CATALOG_ENTRY_FRAGMENT}
  }
  contentType {
    ${CATALOG_ENTRY_FRAGMENT}
  }
`

/**
 * Content entry category fragment
 */
export const CONTENT_ENTRY_CATEGORY_FRAGMENT = `
  id
  contentEntryId
  contentCategoryRef
  recordState
  createdAt
  createdBy
  isDeleted
  contentCategory {
    ${CATALOG_ENTRY_FRAGMENT}
  }
`

/**
 * Content entry tag fragment
 */
export const CONTENT_ENTRY_TAG_FRAGMENT = `
  id
  contentEntryId
  contentTagRef
  recordState
  createdAt
  createdBy
  isDeleted
  contentTag {
    ${CATALOG_ENTRY_FRAGMENT}
  }
`

/**
 * Content document fragment
 */
export const CONTENT_DOCUMENT_FRAGMENT = `
  id
  parentDocumentId
  folder
  name
  description
  fileInfo
  documentGroupRef
  documentTypeRef
  contentEntryId
  recordState
  createdAt
  createdBy
  isDeleted
  documentType {
    ${CATALOG_ENTRY_FRAGMENT}
  }
`

/**
 * Content entry reaction fragment
 */
export const CONTENT_ENTRY_REACTION_FRAGMENT = `
  id
  contentEntryId
  creatorEmployeeId
  reaction
  recordState
  createdAt
  createdBy
  isDeleted
  creatorEmployee {
    ${EMPLOYEE_REF_FRAGMENT}
  }
`

/**
 * Full content entry with all relations
 */
export const CONTENT_ENTRY_FULL_FRAGMENT = `
  ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
  contentEntryCategories {
    ${CONTENT_ENTRY_CATEGORY_FRAGMENT}
  }
  contentEntryTags {
    ${CONTENT_ENTRY_TAG_FRAGMENT}
  }
  contentDocuments {
    ${CONTENT_DOCUMENT_FRAGMENT}
  }
  contentEntryReactions {
    ${CONTENT_ENTRY_REACTION_FRAGMENT}
  }
`
