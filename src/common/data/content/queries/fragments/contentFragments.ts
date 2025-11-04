/**
 * GraphQL Fragments for Content Queries
 * Reusable fragments for consistent data fetching
 */

// Import catalog entry fragment from catalog data
import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'
import { ContentRole } from '../../types/contentEnums'

/**
 * Employee reference fragment
 * FIXED: Removed email (doesn't exist in Employee schema)
 */
export const EMPLOYEE_REF_FRAGMENT = `
  id
  code
  firstName
  lastName
  displayName
  picture
  pictureThumbnail
`

/**
 * Use the centralized catalog entry fragment
 */
export const CATALOG_ENTRY_FRAGMENT = CATALOG_ENTRY_REF

/**
 * Content entry core fields
 */
export const CONTENT_ENTRY_CORE_FRAGMENT = `
  id
  version
  parentContentEntryId
  rootContentEntryId
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
  entryVersion
  activeFrom
  activeTo
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
 * Content document fragment (without children to avoid recursion)
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
 * Content document with children (one level)
 */
export const CONTENT_DOCUMENT_WITH_CHILDREN_FRAGMENT = `
  ${CONTENT_DOCUMENT_FRAGMENT}
  childDocument {
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
  }
`

/**
 * Content entry reaction fragment
 * FIXED: CatalogEntry has no label or icon fields
 */
export const CONTENT_ENTRY_REACTION_FRAGMENT = `
  id
  contentEntryId
  creatorEmployeeId
  contentReactionRef
  createdAt
  createdBy
  isDeleted
  creatorEmployee {
    ${EMPLOYEE_REF_FRAGMENT}
  }
  contentReaction {
    id
    code
    value
    description
  }
`

/**
 * Descendant aggregate for counting ALL nested comments (for News, Knowledge, Documents)
 */
export const DESCENDANT_COMMENT_COUNT_FRAGMENT = `
  descendantContentEntryAggregate(
    where: {
      role: { _eq: "${ContentRole.COMMENT}" }
      isDeleted: { _eq: false }
    }
  ) {
    aggregate {
      count
    }
  }
`

/**
 * Child aggregate for counting DIRECT answers only (for Questions)
 */
export const CHILD_ANSWER_COUNT_FRAGMENT = `
  childContentEntryAggregate(
    where: {
      role: { _eq: "${ContentRole.COMMENT}" }
      isDeleted: { _eq: false }
    }
  ) {
    aggregate {
      count
    }
  }
`

/**
 * Full content entry with all relations
 */
export const CONTENT_ENTRY_FULL_FRAGMENT = `
  ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
  contentEntryCategory {
    ${CONTENT_ENTRY_CATEGORY_FRAGMENT}
  }
  contentEntryTag {
    ${CONTENT_ENTRY_TAG_FRAGMENT}
  }
  contentDocument {
    ${CONTENT_DOCUMENT_FRAGMENT}
  }
  contentEntryReaction {
    ${CONTENT_ENTRY_REACTION_FRAGMENT}
  }
  ${DESCENDANT_COMMENT_COUNT_FRAGMENT}
`

/**
 * Child content entry fragment (for comments, one level only to avoid recursion)
 */
export const CHILD_CONTENT_ENTRY_FRAGMENT = `
  id
  parentContentEntryId
  rootContentEntryId
  title
  preview
  content
  picture
  pictureThumbnail
  creatorEmployeeId
  displayCreator
  allowComment
  allowReaction
  role
  contentGroupRef
  contentTypeRef
  createdAt
  updatedAt
  isDeleted
  creatorEmployee {
    ${EMPLOYEE_REF_FRAGMENT}
  }
`
