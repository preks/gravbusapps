/**
 * Content Entry Types
 * Main content entity types with fields mapping, descriptors, and form fields
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { ContentRole, ContentGroup } from '../constants/contentConstants'
import type { ContentType, ContentCategory, ContentTag } from './contentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'

// =====================================================
// CONTENT ENTRY
// =====================================================

export interface ContentEntry extends BaseEntity {
  // Core fields from GraphQL
  id?: string
  parentContentEntryId?: string | null
  rootContentEntryId?: string | null
  creatorEmployeeId?: string | null
  updaterEmployeeId?: string | null
  acceptorEmployeeId?: string | null
  contentGroup?: ContentGroup | null
  contentTypeId?: string | null
  languageRef?: string | null

  title?: string | null
  preview?: string | null
  content?: string | null
  picture?: string | null
  pictureThumbnail?: string | null
  timeToRead?: number | null
  displayCreator?: boolean
  displayUpdater?: boolean
  allowComment?: boolean
  allowReaction?: boolean
  accepted?: boolean
  role?: ContentRole
  entryVersion?: string | null
  activeFrom?: string
  activeTo?: string

  // Relations from GraphQL
  parentContentEntry?: ContentEntry | null
  creatorEmployee?: EmployeeRef | null
  updaterEmployee?: EmployeeRef | null
  acceptorEmployee?: EmployeeRef | null
  contentType?: ContentType | null
  language?: CatalogEntry | null
  contentEntryCategories?: ContentEntryCategory[]
  contentEntryTags?: ContentEntryTag[]
  contentDocuments?: any[] // ContentDocument (avoid circular)
  contentEntryReactions?: ContentEntryReaction[]
  contentEntryReactionCounts?: {
    contentReactionRef: string
    count: number
    contentReaction?: CatalogEntry | null
  }[] // From view
  childContentEntries?: ContentEntry[]

  // Aggregate fields (from GraphQL queries)
  childContentEntriesAggregate?: { aggregate: { count: number } }
  descendantContentEntriesAggregate?: { aggregate: { count: number } }
}

// =====================================================
// CONTENT ENTRY CATEGORY
// =====================================================

export interface ContentEntryCategory extends BaseEntity {
  id?: string
  contentEntryId: string
  contentCategoryId?: string | null
  recordState?: string

  // Relations from GraphQL
  contentEntry?: ContentEntry | null
  contentCategory?: ContentCategory | null
}

// =====================================================
// CONTENT ENTRY TAG
// =====================================================

export interface ContentEntryTag extends BaseEntity {
  id?: string
  contentEntryId: string
  contentTagId?: string | null
  recordState?: string

  // Relations from GraphQL
  contentEntry?: ContentEntry | null
  contentTag?: ContentTag | null
}

// =====================================================
// CONTENT ENTRY REACTION
// =====================================================

export interface ContentEntryReaction extends BaseEntity {
  id?: string
  contentEntryId: string
  creatorEmployeeId: string
  contentReactionRef?: string | null

  // Relations from GraphQL
  contentEntry?: ContentEntry | null
  creatorEmployee?: EmployeeRef | null
  contentReaction?: CatalogEntry | null
}

// =====================================================
// AGGREGATION TYPES
// =====================================================

export interface ReactionAggregation {
  reactionRef: string
  reactionName: string
  reactionEmoji?: string
  count: number
  employees: EmployeeRef[]
}

export interface ContentEntryStatistics {
  totalEntries: number
  totalComments: number
  totalReactions: number
  totalDocuments: number
  entriesByGroup: Record<string, number>
  entriesByType: Record<string, number>
}

// =====================================================
// FIELD MAPPINGS
// =====================================================

/**
 * ContentEntry GraphQL Field Names Mapping
 * Maps interface property names to actual GraphQL field names
 */
export const ContentEntryFields = {
  // BaseEntity fields
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  recordState: 'recordState',
  activeFrom: 'activeFrom',
  activeTo: 'activeTo',
  version: 'version',
  additionalProperties: 'additionalProperties',

  // ContentEntry fields
  id: 'id',
  parentContentEntryId: 'parentContentEntryId',
  rootContentEntryId: 'rootContentEntryId',
  creatorEmployeeId: 'creatorEmployeeId',
  updaterEmployeeId: 'updaterEmployeeId',
  acceptorEmployeeId: 'acceptorEmployeeId',
  contentGroup: 'contentGroup',
  contentTypeId: 'contentTypeId',
  languageRef: 'languageRef',
  title: 'title',
  preview: 'preview',
  content: 'content',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  timeToRead: 'timeToRead',
  displayCreator: 'displayCreator',
  displayUpdater: 'displayUpdater',
  allowComment: 'allowComment',
  allowReaction: 'allowReaction',
  accepted: 'accepted',
  role: 'role',
  entryVersion: 'entryVersion',

  // Relations
  parentContentEntry: 'parentContentEntry',
  creatorEmployee: 'creatorEmployee',
  updaterEmployee: 'updaterEmployee',
  acceptorEmployee: 'acceptorEmployee',
  contentType: 'contentType',
  language: 'language',
  contentEntryCategories: 'contentEntryCategories',
  contentEntryTags: 'contentEntryTags',
  contentDocuments: 'contentDocuments',
  contentEntryReactions: 'contentEntryReactions',
  contentEntryReactionCounts: 'contentEntryReactionCounts',
  childContentEntries: 'childContentEntries',

  // Aggregates
  childContentEntriesAggregate: 'childContentEntriesAggregate',
  descendantContentEntriesAggregate: 'descendantContentEntriesAggregate'
} as const

// =====================================================
// DESCRIPTORS
// =====================================================

/**
 * Content Entry Descriptors
 * Used for building dynamic GraphQL queries with search, filter, and sort capabilities
 */
export const CONTENT_ENTRY_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  // Content Entry specific fields
  { key: 'id', searchPaths: ['id'], sortPath: 'id', type: 'text' },
  {
    key: 'parentContentEntryId',
    searchPaths: ['parentContentEntryId'],
    sortPath: 'parentContentEntryId',
    type: 'text'
  },
  { key: 'rootContentEntryId', searchPaths: ['rootContentEntryId'], sortPath: 'rootContentEntryId', type: 'text' },
  { key: 'creatorEmployeeId', searchPaths: ['creatorEmployeeId'], sortPath: 'creatorEmployeeId', type: 'text' },
  { key: 'updaterEmployeeId', searchPaths: ['updaterEmployeeId'], sortPath: 'updaterEmployeeId', type: 'text' },
  { key: 'acceptorEmployeeId', searchPaths: ['acceptorEmployeeId'], sortPath: 'acceptorEmployeeId', type: 'text' },
  { key: 'contentGroup', searchPaths: ['contentGroup'], sortPath: 'contentGroup', type: 'text' },
  {
    key: 'contentTypeId',
    path: ContentEntryFields.contentTypeId,
    filterLabel: 'Content Type',
    searchPaths: ['contentTypeId', 'contentType.name'],
    sortPath: 'contentTypeId',
    type: 'text',
    optionSelectPaths: [`${ContentEntryFields.contentTypeId}`, `${ContentEntryFields.contentType}.name`],
    optionSearchPaths: [`${ContentEntryFields.contentType}.name`],
    optionDistinctOn: [ContentEntryFields.contentTypeId],
    kind: 'inIds'
  },
  { key: 'languageRef', searchPaths: ['languageRef'], sortPath: 'languageRef', type: 'text' },
  { key: 'title', searchPaths: ['title'], sortPath: 'title', type: 'text' },
  { key: 'preview', searchPaths: ['preview'], sortPath: 'preview', type: 'text' },
  { key: 'content', searchPaths: ['content'], sortPath: 'content', type: 'text' },
  { key: 'picture', searchPaths: ['picture'], sortPath: 'picture', type: 'text' },
  { key: 'pictureThumbnail', searchPaths: ['pictureThumbnail'], sortPath: 'pictureThumbnail', type: 'text' },
  { key: 'timeToRead', searchPaths: ['timeToRead'], sortPath: 'timeToRead', type: 'number' },
  { key: 'displayCreator', searchPaths: ['displayCreator'], sortPath: 'displayCreator', type: 'boolean' },
  { key: 'displayUpdater', searchPaths: ['displayUpdater'], sortPath: 'displayUpdater', type: 'boolean' },
  { key: 'allowComment', searchPaths: ['allowComment'], sortPath: 'allowComment', type: 'boolean' },
  { key: 'allowReaction', searchPaths: ['allowReaction'], sortPath: 'allowReaction', type: 'boolean' },
  { key: 'role', searchPaths: ['role'], sortPath: 'role', type: 'text' },
  { key: 'entryVersion', searchPaths: ['entryVersion'], sortPath: 'entryVersion', type: 'text' },

  // Nested relations
  {
    key: 'creatorEmployeeName',
    searchPaths: ['creatorEmployee.firstName', 'creatorEmployee.lastName', 'creatorEmployee.displayName'],
    sortPaths: ['creatorEmployee.firstName', 'creatorEmployee.lastName'],
    type: 'text'
  },
  {
    key: 'updaterEmployeeName',
    searchPaths: ['updaterEmployee.firstName', 'updaterEmployee.lastName', 'updaterEmployee.displayName'],
    sortPaths: ['updaterEmployee.firstName', 'updaterEmployee.lastName'],
    type: 'text'
  },
  {
    key: 'acceptorEmployeeName',
    searchPaths: ['acceptorEmployee.firstName', 'acceptorEmployee.lastName', 'acceptorEmployee.displayName'],
    sortPaths: ['acceptorEmployee.firstName', 'acceptorEmployee.lastName'],
    type: 'text'
  },
  {
    key: 'contentTypeName',
    searchPaths: ['contentType.name'],
    sortPath: 'contentType.name',
    type: 'text'
  },
  {
    key: 'languageName',
    searchPaths: ['language.value'],
    sortPath: 'language.value',
    type: 'text'
  },
  {
    key: 'categoryNames',
    searchPaths: ['contentEntryCategories.contentCategory.name'],
    sortPath: 'contentEntryCategories.contentCategory.name',
    type: 'text'
  },
  {
    key: 'contentCategoryIds',
    path: 'contentEntryCategories.contentCategoryId',
    filterLabel: 'Category',
    searchPaths: ['contentEntryCategories.contentCategory.name'],
    sortPath: 'contentEntryCategories.contentCategory.name',
    type: 'text',
    optionSelectPaths: [
      `${ContentEntryFields.contentEntryCategories}.contentCategoryId`,
      `${ContentEntryFields.contentEntryCategories}.contentCategory.name`
    ],
    optionSearchPaths: [`${ContentEntryFields.contentEntryCategories}.contentCategory.name`],
    optionDistinctOn: [],
    kind: 'inIds'
  },
  {
    key: 'tagNames',
    searchPaths: ['contentEntryTags.contentTag.name'],
    sortPath: 'contentEntryTags.contentTag.name',
    type: 'text'
  },

  // Aggregate counts
  {
    key: 'commentCount',
    sortPath: 'descendantContentEntriesAggregate.count',
    type: 'number',
    enableFilter: false
  }
]

// =====================================================
// FORM FIELDS
// =====================================================

/**
 * Content Entry Form Fields
 * Maps form field names to GraphQL mutation field names
 */
export const ContentEntryFormFields = {
  // Core fields
  parentContentEntryId: 'parentContentEntryId',
  rootContentEntryId: 'rootContentEntryId',
  creatorEmployeeId: 'creatorEmployeeId',
  updaterEmployeeId: 'updaterEmployeeId',
  acceptorEmployeeId: 'acceptorEmployeeId',
  contentGroup: 'contentGroup',
  contentTypeId: 'contentTypeId',
  languageRef: 'languageRef',
  title: 'title',
  preview: 'preview',
  content: 'content',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  timeToRead: 'timeToRead',
  displayCreator: 'displayCreator',
  displayUpdater: 'displayUpdater',
  allowComment: 'allowComment',
  allowReaction: 'allowReaction',
  role: 'role',
  entryVersion: 'entryVersion',
  activeFrom: 'activeFrom',
  activeTo: 'activeTo',
  recordState: 'recordState'
} as const
