import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import { JobRequestType, JobRequestStatus } from './enums'

/**
 * JobPosition reference type
 */
export interface JobPosition {
  id?: string
  name?: string
}

/**
 * OrganizationalUnit reference type
 */
export interface OrganizationalUnit {
  id: string
  name: string
}

/**
 * Company reference type
 */
export interface Company {
  id: string
  name?: string
}

/**
 * CostCenter reference type
 */
export interface CostCenter {
  id: string
  name?: string
}

/**
 * SiteLocation reference type
 */
export interface SiteLocation {
  id: string
  name?: string
}

/**
 * JobProfile reference type
 */
export interface JobProfile {
  id: string
  name?: string
}

/**
 * JobRequest Type
 * Represents the actual data model from GraphQL
 */
export interface JobRequest extends BaseEntity {
  id?: string
  code?: string
  name: string
  description?: string
  plannedHireDate?: string
  plannedExitDate?: string

  // Enum fields
  jobRequestType?: JobRequestType
  jobRequestStatus?: JobRequestStatus

  // Catalog References (objects)
  contractType?: CatalogEntry
  employmentType?: CatalogEntry
  jobExperienceLevel?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  contractTypeRef?: string
  employmentTypeRef?: string
  jobExperienceLevelRef?: string

  // Entity References (objects)
  organizationalUnit?: OrganizationalUnit
  company?: Company
  costCenter?: CostCenter
  siteLocation?: SiteLocation
  jobProfile?: JobProfile
  jobPosition?: JobPosition
  requesterEmployee?: Employee

  // Entity Reference IDs (Id fields)
  organizationalUnitId?: string
  companyId?: string
  costCenterId?: string
  siteLocationId?: string
  jobProfileId?: string
  jobPositionId?: string
  requesterEmployeeId?: string
}

/**
 * JobRequest Fields
 * ALL fields including Ref and Id fields
 * Note: Backend uses NEW field names matching TypeScript
 */
export const JobRequestFields = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  plannedHireDate: 'plannedHireDate',
  plannedExitDate: 'plannedExitDate',

  // Enum fields
  jobRequestType: 'jobRequestType',
  jobRequestStatus: 'jobRequestStatus',

  // Catalog References (objects)
  contractType: 'contractType',
  employmentType: 'employmentType',
  jobExperienceLevel: 'jobExperienceLevel',

  // Catalog Reference IDs (Ref fields)
  contractTypeRef: 'contractTypeRef',
  employmentTypeRef: 'employmentTypeRef',
  jobExperienceLevelRef: 'jobExperienceLevelRef',

  // Entity References (objects)
  organizationalUnit: 'organizationalUnit',
  company: 'company',
  costCenter: 'costCenter',
  siteLocation: 'siteLocation',
  jobProfile: 'jobProfile',
  jobPosition: 'jobPosition',
  requesterEmployee: 'requesterEmployee',

  // Entity Reference IDs (Id fields)
  organizationalUnitId: 'organizationalUnitId',
  companyId: 'companyId',
  costCenterId: 'costCenterId',
  siteLocationId: 'siteLocationId',
  jobProfileId: 'jobProfileId',
  jobPositionId: 'jobPositionId',
  requesterEmployeeId: 'requesterEmployeeId'
} as const

/**
 * JobRequest Descriptors
 * Field descriptors for query building
 */
export const JOB_REQUEST_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  { key: 'plannedHireDate', searchPaths: ['plannedHireDate'], sortPath: 'plannedHireDate', type: 'date' },
  { key: 'plannedExitDate', searchPaths: ['plannedExitDate'], sortPath: 'plannedExitDate', type: 'date' },
  { key: 'jobRequestType', searchPaths: ['jobRequestType'], sortPath: 'jobRequestType', type: 'text' },
  { key: 'jobRequestStatus', searchPaths: ['jobRequestStatus'], sortPath: 'jobRequestStatus', type: 'text' },
  {
    key: 'contractType',
    searchPaths: ['contractType.value'],
    sortPath: 'contractType.value',
    type: 'text'
  },
  {
    key: 'employmentType',
    searchPaths: ['employmentType.value'],
    sortPath: 'employmentType.value',
    type: 'text'
  },
  {
    key: 'jobExperienceLevel',
    searchPaths: ['jobExperienceLevel.value'],
    sortPath: 'jobExperienceLevel.value',
    type: 'text'
  },
  {
    key: 'organizationalUnit',
    searchPaths: ['organizationalUnit.name'],
    sortPath: 'organizationalUnit.name',
    type: 'text'
  },
  {
    key: 'company',
    searchPaths: ['company.name'],
    sortPath: 'company.name',
    type: 'text'
  },
  {
    key: 'costCenter',
    searchPaths: ['costCenter.name'],
    sortPath: 'costCenter.name',
    type: 'text'
  },
  {
    key: 'siteLocation',
    searchPaths: ['siteLocation.name'],
    sortPath: 'siteLocation.name',
    type: 'text'
  },
  {
    key: 'jobProfile',
    searchPaths: ['jobProfile.name'],
    sortPath: 'jobProfile.name',
    type: 'text'
  },
  {
    key: 'jobPosition',
    searchPaths: ['jobPosition.name'],
    sortPath: 'jobPosition.name',
    type: 'text'
  },
  {
    key: 'requesterEmployee',
    searchPaths: ['requesterEmployee.firstName', 'requesterEmployee.lastName', 'requesterEmployee.displayName'],
    sortPath: 'requesterEmployee.displayName',
    type: 'text'
  }
]
