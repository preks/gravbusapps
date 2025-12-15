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
 * JobRequest Type
 * Represents the actual data model from GraphQL
 */
export interface JobRequest extends BaseEntity {
  id?: string
  code?: string
  title: string
  description?: string
  requestDate?: string
  requiredStartDate?: string
  status?: string

  // Catalog References (objects)
  jobRequestStatus?: CatalogEntry
  jobRequestType?: CatalogEntry
  priority?: CatalogEntry
  department?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  jobRequestStatusRef?: string
  jobRequestTypeRef?: string
  priorityRef?: string
  departmentRef?: string

  // Entity References (objects)
  requestedByEmployee?: Employee
  jobPosition?: JobPosition
  approvedByEmployee?: Employee

  // Entity Reference IDs (Id fields)
  requestedByEmployeeId?: string
  jobPositionId?: string
  approvedByEmployeeId?: string
}

/**
 * JobRequest Fields
 * ALL fields including Ref and Id fields
 */
export const JobRequestFields = {
  id: 'id',
  code: 'code',
  title: 'title',
  description: 'description',
  requestDate: 'requestDate',
  requiredStartDate: 'requiredStartDate',
  status: 'status',

  // Catalog References (objects)
  jobRequestStatus: 'jobRequestStatus',
  jobRequestType: 'jobRequestType',
  priority: 'priority',
  department: 'department',

  // Catalog Reference IDs (Ref fields)
  jobRequestStatusRef: 'jobRequestStatusRef',
  jobRequestTypeRef: 'jobRequestTypeRef',
  priorityRef: 'priorityRef',
  departmentRef: 'departmentRef',

  // Entity References (objects)
  requestedByEmployee: 'requestedByEmployee',
  jobPosition: 'jobPosition',
  approvedByEmployee: 'approvedByEmployee',

  // Entity Reference IDs (Id fields)
  requestedByEmployeeId: 'requestedByEmployeeId',
  jobPositionId: 'jobPositionId',
  approvedByEmployeeId: 'approvedByEmployeeId'
} as const

/**
 * JobRequest Descriptors
 * Field descriptors for query building
 */
export const JOB_REQUEST_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'title', searchPaths: ['title'], sortPath: 'title', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  { key: 'requestDate', searchPaths: ['requestDate'], sortPath: 'requestDate', type: 'date' },
  { key: 'requiredStartDate', searchPaths: ['requiredStartDate'], sortPath: 'requiredStartDate', type: 'date' },
  { key: 'status', searchPaths: ['status'], sortPath: 'status', type: 'text' },
  {
    key: 'jobRequestStatus',
    searchPaths: ['jobRequestStatus.value'],
    sortPath: 'jobRequestStatus.value',
    type: 'text'
  },
  {
    key: 'jobRequestType',
    searchPaths: ['jobRequestType.value'],
    sortPath: 'jobRequestType.value',
    type: 'text'
  },
  {
    key: 'priority',
    searchPaths: ['priority.value'],
    sortPath: 'priority.value',
    type: 'text'
  },
  {
    key: 'department',
    searchPaths: ['department.value'],
    sortPath: 'department.value',
    type: 'text'
  },
  {
    key: 'requestedByEmployee',
    searchPaths: ['requestedByEmployee.firstName', 'requestedByEmployee.lastName', 'requestedByEmployee.displayName'],
    sortPath: 'requestedByEmployee.displayName',
    type: 'text'
  },
  {
    key: 'jobPosition',
    searchPaths: ['jobPosition.name'],
    sortPath: 'jobPosition.name',
    type: 'text'
  },
  {
    key: 'approvedByEmployee',
    searchPaths: ['approvedByEmployee.firstName', 'approvedByEmployee.lastName', 'approvedByEmployee.displayName'],
    sortPath: 'approvedByEmployee.displayName',
    type: 'text'
  }
]
