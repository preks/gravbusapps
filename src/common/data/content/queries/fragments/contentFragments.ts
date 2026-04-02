/**
 * GraphQL Fragments for Content Queries
 * Reusable fragments for consistent data fetching
 */

import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'
import { ContentRole } from '../../constants/contentConstants'
import { CONTENT_DOCUMENT_FRAGMENT } from '../../types/contentDocumentTypes'

// Re-export document fragment for backwards compatibility
export { CONTENT_DOCUMENT_FRAGMENT } from '../../types/contentDocumentTypes'

/**
 * Employee reference fragment
 * Extended to include job position, organizational unit, and work communications
 * Note: picture field should be used with buildFileUrl utility for image loading
 */
export const EMPLOYEE_REF_FRAGMENT = `
  id
  code
  firstName
  lastName
  displayName
  picture
  employeePosition {
    jobPosition {
      name
    }
    organizationalUnit {
      name
    }
  }
  communication(where: {_and: [{isDeleted: {_eq: false}}, {purpose: {_eq: "INTERNAL"}}]}) {
    purpose
    channel {
      value
      code
    }
    value
    type {
      value
    }
  }
`

/**
 * Use the centralized catalog entry fragment (still needed for language and reactions)
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
  timeToRead
  creatorEmployeeId
  updaterEmployeeId
  acceptorEmployeeId
  displayCreator
  displayUpdater
  allowComment
  allowReaction
  accepted
  role
  contentGroup
  contentTypeId
  languageRef
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
  acceptorEmployee {
    ${EMPLOYEE_REF_FRAGMENT}
  }
`

/**
 * Content entry with taxonomy and catalog relations
 */
export const CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT = `
  ${CONTENT_ENTRY_WITH_EMPLOYEES_FRAGMENT}
  contentType {
    id
    name
    nameI18n
    contentGroup
  }
  language {
    ${CATALOG_ENTRY_FRAGMENT}
  }
`

/**
 * Content entry category fragment
 */
export const CONTENT_ENTRY_CATEGORY_FRAGMENT = `
  id
  contentEntryId
  contentCategoryId
  recordState
  createdAt
  createdBy
  isDeleted
  contentCategory {
    id
    name
    nameI18n
  }
`

/**
 * Content entry tag fragment
 */
export const CONTENT_ENTRY_TAG_FRAGMENT = `
  id
  contentEntryId
  contentTagId
  recordState
  createdAt
  createdBy
  isDeleted
  contentTag {
    id
    name
    nameI18n
  }
`

/**
 * Content document with children (one level)
 */
export const CONTENT_DOCUMENT_WITH_CHILDREN_FRAGMENT = `
  ${CONTENT_DOCUMENT_FRAGMENT}
  childDocuments {
    id
    version
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
  descendantContentEntriesAggregate(
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
  childContentEntriesAggregate(
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
  creatorEmployeeId
  displayCreator
  allowComment
  allowReaction
  role
  contentGroup
  contentTypeId
  createdAt
  updatedAt
  isDeleted
  creatorEmployee {
    ${EMPLOYEE_REF_FRAGMENT}
  }
`
