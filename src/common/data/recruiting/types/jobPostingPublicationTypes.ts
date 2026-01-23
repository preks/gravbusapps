import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobPosting } from './jobPostingTypes'

/**
 * JobPostingPublication Type
 */
export interface JobPostingPublication extends BaseEntity {
  id?: string
  url?: string // URL to publication on LinkedIn, Indeed, etc.

  // Catalog references
  jobPostingChannelRef?: string // changed from channel_id FK

  // Catalog objects
  jobPostingChannel?: CatalogEntry

  // Entity References (objects)
  jobPosting?: JobPosting

  // Entity Reference IDs (Id fields)
  jobPostingId?: string

  // Plural Relations (arrays)
  jobApplications?: import('./jobApplicationTypes').JobApplication[]
}

/**
 * JobPostingPublication Fields
 */
export const JobPostingPublicationFields = {
  id: 'id',
  url: 'url',

  // Catalog references
  jobPostingChannelRef: 'jobPostingChannelRef',

  // Catalog objects
  jobPostingChannel: 'jobPostingChannel',

  // Entity references
  jobPosting: 'jobPosting',

  // Entity IDs
  jobPostingId: 'jobPostingId',

  // Plural Relations
  jobApplications: 'jobApplications'
} as const

/**
 * JobPostingPublication Descriptors
 */
export const JOB_POSTING_PUBLICATION_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'url', searchPaths: ['url'], sortPath: 'url', type: 'text' },
  {
    key: 'jobPostingChannel',
    searchPaths: ['jobPostingChannel.value'],
    sortPath: 'jobPostingChannel.value',
    type: 'text'
  },
  {
    key: 'jobPosting',
    searchPaths: ['jobPosting.title'],
    sortPath: 'jobPosting.title',
    type: 'text'
  }
]
