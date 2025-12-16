import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * JobRequest Type
 * Represents the actual data model from GraphQL
 */
export interface JobRequest extends BaseEntity {
  id?: string
  code?: string
  name?: string
  note?: string
  headcount?: number
  endDate?: string

  // Catalog References (objects)
  contractType?: CatalogEntry
  experienceLevel?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  contractTypeRef?: string
  experienceLevelRef?: string

  // Entity Reference IDs (Id fields)
  costCenterId?: string
  jobProfileId?: string
  organizationalUnitId?: string
  replacedPositionId?: string
}

/**
 * JobRequest Fields
 * ALL fields including Ref and Id fields
 */
export const JobRequestFields = {
  id: 'id',
  code: 'code',
  name: 'name',
  note: 'note',
  headcount: 'headcount',
  endDate: 'endDate',

  // Catalog References (objects)
  contractType: 'contractType',
  experienceLevel: 'experienceLevel',

  // Catalog Reference IDs (Ref fields)
  contractTypeRef: 'contractTypeRef',
  experienceLevelRef: 'experienceLevelRef',

  // Entity Reference IDs (Id fields)
  costCenterId: 'costCenterId',
  jobProfileId: 'jobProfileId',
  organizationalUnitId: 'organizationalUnitId',
  replacedPositionId: 'replacedPositionId'
} as const

/**
 * JobRequest Descriptors
 * Field descriptors for query building
 */
export const JOB_REQUEST_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  { key: 'note', searchPaths: ['note'], sortPath: 'note', type: 'text' },
  { key: 'headcount', searchPaths: ['headcount'], sortPath: 'headcount', type: 'number' },
  { key: 'endDate', searchPaths: ['endDate'], sortPath: 'endDate', type: 'date' },
  {
    key: 'contractType',
    searchPaths: ['contractType.value'],
    sortPath: 'contractType.value',
    type: 'text'
  },
  {
    key: 'experienceLevel',
    searchPaths: ['experienceLevel.value'],
    sortPath: 'experienceLevel.value',
    type: 'text'
  }
]
