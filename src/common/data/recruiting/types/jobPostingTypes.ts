import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * JobRequest reference type
 */
export interface JobRequest {
  id?: string
  name?: string
}

/**
 * JobPosting Type
 */
export interface JobPosting extends BaseEntity {
  id?: string
  title?: string
  titleI18n?: any
  content?: string
  contentI18n?: any
  fileInfo?: any

  // Entity References
  jobRequest?: JobRequest

  // Entity Reference IDs
  jobRequestId?: string
}

/**
 * JobPosting Fields
 */
export const JobPostingFields = {
  id: 'id',
  title: 'title',
  titleI18n: 'titleI18n',
  content: 'content',
  contentI18n: 'contentI18n',
  fileInfo: 'fileInfo',

  // Entity references
  jobRequest: 'jobRequest',
  jobRequestId: 'jobRequestId'
} as const

/**
 * JobPosting Descriptors
 */
export const JOB_POSTING_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'title', searchPaths: ['title'], sortPath: 'title', type: 'text' },
  { key: 'content', searchPaths: ['content'], sortPath: 'content', type: 'text' },
  {
    key: 'jobRequest',
    searchPaths: ['jobRequest.name'],
    sortPath: 'jobRequest.name',
    type: 'text'
  }
]
