import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * JobPosting Type
 */
export interface JobPosting extends BaseEntity {
  id?: string
  jobTitle?: string
  department?: string
  location?: string
  contractType?: string
  remote?: string
}

/**
 * JobPosting Fields
 */
export const JobPostingFields = {
  id: 'id',
  jobTitle: 'jobTitle',
  department: 'department',
  location: 'location',
  contractType: 'contractType',
  remote: 'remote'
} as const

/**
 * JobPosting Descriptors
 */
export const JOB_POSTING_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'jobTitle', searchPaths: ['jobTitle'], sortPath: 'jobTitle', type: 'text' },
  { key: 'department', searchPaths: ['department'], sortPath: 'department', type: 'text' },
  { key: 'location', searchPaths: ['location'], sortPath: 'location', type: 'text' },
  { key: 'contractType', searchPaths: ['contractType'], sortPath: 'contractType', type: 'text' },
  { key: 'remote', searchPaths: ['remote'], sortPath: 'remote', type: 'text' }
]
