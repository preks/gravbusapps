import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobPosting } from './jobPostingTypes'
import type { JobPosition } from './jobRequestTypes'

/**
 * JobPostingPosition Type
 * Junction table: One job posting can be associated with multiple positions to be filled
 */
export interface JobPostingPosition extends BaseEntity {
  id?: string

  // Entity References (objects)
  jobPosting?: JobPosting
  jobPosition?: JobPosition

  // Entity Reference IDs (Id fields)
  jobPostingId?: string
  jobPositionId?: string
}

/**
 * JobPostingPosition Fields
 */
export const JobPostingPositionFields = {
  id: 'id',

  // Entity references
  jobPosting: 'jobPosting',
  jobPosition: 'jobPosition',

  // Entity IDs
  jobPostingId: 'jobPostingId',
  jobPositionId: 'jobPositionId'
} as const

/**
 * JobPostingPosition Descriptors
 */
export const JOB_POSTING_POSITION_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'jobPosting',
    searchPaths: ['jobPosting.title'],
    sortPath: 'jobPosting.title',
    type: 'text'
  },
  {
    key: 'jobPosition',
    searchPaths: ['jobPosition.name'],
    sortPath: 'jobPosition.name',
    type: 'text'
  }
]
