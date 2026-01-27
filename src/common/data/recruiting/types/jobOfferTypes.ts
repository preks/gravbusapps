import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobApplication } from './jobApplicationTypes'
import { JobOfferStatus } from './enums'

/**
 * JobPosition reference type
 */
export interface JobPosition {
  id?: string
  name?: string
}

/**
 * JobCandidateDocument reference type
 */
export interface JobCandidateDocument {
  id?: string
  name?: string
}

/**
 * JobOffer Type
 */
export interface JobOffer extends BaseEntity {
  id?: string
  offerDate?: string
  decisionDate?: string
  expirationDate?: string
  workingConditions?: any // Jsonb - mirrors employee working conditions

  // Enum field
  jobOfferStatus?: JobOfferStatus

  // Entity References (objects)
  jobApplication?: JobApplication
  jobPosition?: JobPosition
  contractDocument?: JobCandidateDocument

  // Entity Reference IDs (Id fields)
  jobApplicationId?: string
  jobPositionId?: string
  contractDocumentId?: string
}

/**
 * JobOffer Fields
 */
export const JobOfferFields = {
  id: 'id',
  offerDate: 'offerDate',
  decisionDate: 'decisionDate',
  expirationDate: 'expirationDate',
  workingConditions: 'workingConditions',
  jobOfferStatus: 'jobOfferStatus',

  // Entity references
  jobApplication: 'jobApplication',
  jobPosition: 'jobPosition',
  contractDocument: 'contractDocument',

  // Entity IDs
  jobApplicationId: 'jobApplicationId',
  jobPositionId: 'jobPositionId',
  contractDocumentId: 'contractDocumentId'
} as const

/**
 * JobOffer Descriptors
 */
export const JOB_OFFER_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'offerDate', searchPaths: ['offerDate'], sortPath: 'offerDate', type: 'date' },
  { key: 'decisionDate', searchPaths: ['decisionDate'], sortPath: 'decisionDate', type: 'date' },
  { key: 'expirationDate', searchPaths: ['expirationDate'], sortPath: 'expirationDate', type: 'date' },
  { key: 'jobOfferStatus', searchPaths: ['jobOfferStatus'], sortPath: 'jobOfferStatus', type: 'text' },
  {
    key: 'jobPosition',
    searchPaths: ['jobPosition.name'],
    sortPath: 'jobPosition.name',
    type: 'text'
  }
]
