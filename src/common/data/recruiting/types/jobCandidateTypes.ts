import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * JobCandidate Type
 */
export interface JobCandidate extends BaseEntity {
  id?: string
  code?: string
  firstName: string
  lastName: string
}

/**
 * JobCandidate Fields
 */
export const JobCandidateFields = {
  id: 'id',
  code: 'code',
  firstName: 'firstName',
  lastName: 'lastName'
} as const

/**
 * JobCandidate Descriptors
 */
export const JOB_CANDIDATE_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'firstName', searchPaths: ['firstName'], sortPath: 'firstName', type: 'text' },
  { key: 'lastName', searchPaths: ['lastName'], sortPath: 'lastName', type: 'text' }
]
