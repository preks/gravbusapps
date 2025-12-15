import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * JobPosition reference type
 */
export interface JobPosition {
  id?: string
  name?: string
}

/**
 * JobRequest Type (JobRequisition)
 * Represents the actual data model from GraphQL
 */
export interface JobRequest extends BaseEntity {
  id?: string
  code?: string
  name: string
  note?: string
  headcount: number
  startDate?: string
  endDate?: string
  requisitionStatus?: string

  // Catalog References (objects)
  reason?: CatalogEntry
  contractType?: CatalogEntry
  experienceLevel?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  reasonRef?: string
  contractTypeRef?: string
  experienceLevelRef?: string

  // Entity References (objects)
  organizationalUnit?: {
    id: string
    name: string
  }
  jobPosition?: JobPosition
  requester?: Employee

  // Entity Reference IDs (Id fields)
  organizationalUnitId?: string
  jobPositionId?: string
  requesterId?: string
  jobProfileId?: string
  costCenterId?: string
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
  startDate: 'startDate',
  endDate: 'endDate',
  requisitionStatus: 'requisitionStatus',

  // Catalog References (objects)
  reason: 'reason',
  contractType: 'contractType',
  experienceLevel: 'experienceLevel',

  // Catalog Reference IDs (Ref fields)
  reasonRef: 'reasonRef',
  contractTypeRef: 'contractTypeRef',
  experienceLevelRef: 'experienceLevelRef',

  // Entity References (objects)
  organizationalUnit: 'organizationalUnit',
  jobPosition: 'jobPosition',
  requester: 'requester',

  // Entity Reference IDs (Id fields)
  organizationalUnitId: 'organizationalUnitId',
  jobPositionId: 'jobPositionId',
  requesterId: 'requesterId',
  jobProfileId: 'jobProfileId',
  costCenterId: 'costCenterId',
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
  { key: 'startDate', searchPaths: ['startDate'], sortPath: 'startDate', type: 'date' },
  { key: 'endDate', searchPaths: ['endDate'], sortPath: 'endDate', type: 'date' },
  { key: 'requisitionStatus', searchPaths: ['requisitionStatus'], sortPath: 'requisitionStatus', type: 'text' },
  {
    key: 'reason',
    searchPaths: ['reason.value'],
    sortPath: 'reason.value',
    type: 'text'
  },
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
  },
  {
    key: 'organizationalUnit',
    searchPaths: ['organizationalUnit.name'],
    sortPath: 'organizationalUnit.name',
    type: 'text'
  },
  {
    key: 'jobPosition',
    searchPaths: ['jobPosition.name'],
    sortPath: 'jobPosition.name',
    type: 'text'
  },
  {
    key: 'requester',
    searchPaths: ['requester.firstName', 'requester.lastName', 'requester.displayName'],
    sortPath: 'requester.displayName',
    type: 'text'
  }
]
