import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobCandidate } from './jobCandidateTypes'

/**
 * JobCandidateDocument Type
 */
export interface JobCandidateDocument extends BaseEntity {
  id?: string
  name?: string
  description?: string
  fileInfo?: any // Jsonb - renamed from document
  folder?: boolean
  mandatory?: boolean
  authenticated?: boolean
  authenticationDate?: string
  verified?: boolean
  verificationDate?: string
  expirationDate?: string

  // Catalog references
  documentGroupRef?: string // renamed from documentCategory
  documentTypeRef?: string

  // Catalog objects
  documentGroup?: CatalogEntry
  documentType?: CatalogEntry

  // Entity References (objects)
  jobCandidate?: JobCandidate

  // Entity Reference IDs (Id fields)
  jobCandidateId?: string

  // Plural Relations (arrays)
  jobOffers?: import('./jobOfferTypes').JobOffer[]
}

/**
 * JobCandidateDocument Fields
 * Note: Backend uses NEW field names matching TypeScript
 */
export const JobCandidateDocumentFields = {
  id: 'id',
  name: 'name',
  description: 'description',
  fileInfo: 'fileInfo',
  folder: 'folder',
  mandatory: 'mandatory',
  authenticated: 'authenticated',
  authenticationDate: 'authenticationDate',
  verified: 'verified',
  verificationDate: 'verificationDate',
  expirationDate: 'expirationDate',

  // Catalog references
  documentGroupRef: 'documentGroupRef',
  documentTypeRef: 'documentTypeRef',

  // Catalog objects
  documentGroup: 'documentGroup',
  documentType: 'documentType',

  // Entity references
  jobCandidate: 'jobCandidate',

  // Entity IDs
  jobCandidateId: 'jobCandidateId',

  // Plural Relations
  jobOffers: 'jobOffers'
} as const

/**
 * JobCandidateDocument Descriptors
 */
export const JOB_CANDIDATE_DOCUMENT_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  { key: 'authenticationDate', searchPaths: ['authenticationDate'], sortPath: 'authenticationDate', type: 'date' },
  { key: 'verificationDate', searchPaths: ['verificationDate'], sortPath: 'verificationDate', type: 'date' },
  { key: 'expirationDate', searchPaths: ['expirationDate'], sortPath: 'expirationDate', type: 'date' },
  {
    key: 'documentGroup',
    searchPaths: ['documentGroup.value'],
    sortPath: 'documentGroup.value',
    type: 'text'
  },
  {
    key: 'documentType',
    searchPaths: ['documentType.value'],
    sortPath: 'documentType.value',
    type: 'text'
  }
]
