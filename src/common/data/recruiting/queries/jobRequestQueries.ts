/**
 * JobRequest Queries
 * GraphQL fragment builder for JobRequest entities
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { JobRequestFields } from '../types/jobRequestTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

/**
 * JobRequest Query Variables
 */
export interface JobRequestQueryVariables extends BaseQueryVariables {
  jobRequestStatusRef?: string
  jobRequestTypeRef?: string
  priorityRef?: string
  departmentRef?: string
  requestedByEmployeeId?: string
  jobPositionId?: string
  approvedByEmployeeId?: string
}

/**
 * Pre-defined Query Configurations
 */
export const JOB_REQUEST_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['code', 'createdAt', 'id', 'title'],
  list: [
    'code',
    'createdAt',
    'id',
    'title',
    'requestDate',
    'requiredStartDate',
    'jobRequestStatus',
    'jobRequestStatusRef',
    'priority',
    'priorityRef',
    'requestedByEmployee',
    'requestedByEmployeeId',
    'jobPosition',
    'jobPositionId',
    'updatedAt'
  ],
  record: [
    'code',
    'createdAt',
    'createdBy',
    'id',
    'title',
    'description',
    'requestDate',
    'requiredStartDate',
    'status',
    'jobRequestStatus',
    'jobRequestStatusRef',
    'jobRequestType',
    'jobRequestTypeRef',
    'priority',
    'priorityRef',
    'department',
    'departmentRef',
    'requestedByEmployee',
    'requestedByEmployeeId',
    'jobPosition',
    'jobPositionId',
    'approvedByEmployee',
    'approvedByEmployeeId',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties'
  ]
}

/**
 * Build scalar fields fragment
 */
const buildScalarFields = (fieldSet: Set<string>): string => {
  const scalarFields = [
    { key: 'id', value: 'id' },
    { key: 'version', value: 'version' },
    { key: 'code', value: JobRequestFields.code },
    { key: 'title', value: JobRequestFields.title },
    { key: 'description', value: JobRequestFields.description },
    { key: 'requestDate', value: JobRequestFields.requestDate },
    { key: 'requiredStartDate', value: JobRequestFields.requiredStartDate },
    { key: 'status', value: JobRequestFields.status },
    { key: 'createdAt', value: 'createdAt' },
    { key: 'createdBy', value: 'createdBy' },
    { key: 'updatedAt', value: 'updatedAt' },
    { key: 'updatedBy', value: 'updatedBy' },
    { key: 'isDeleted', value: 'isDeleted' },
    { key: 'recordState', value: 'recordState' },
    { key: 'activeFrom', value: 'activeFrom' },
    { key: 'activeTo', value: 'activeTo' },
    { key: 'additionalProperties', value: 'additionalProperties' }
  ]

  return scalarFields
    .filter(field => fieldSet.has(field.key))
    .map(field => field.value)
    .join('\n    ')
}

/**
 * Build catalog reference field fragment
 */
const buildCatalogReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) {
    return ''
  }
  const hasObject = fieldSet.has(fieldName)
  return `
      ${hasObject ? `${fieldKey} { ${CATALOG_ENTRY} }` : ''}
      ${JobRequestFields[fieldRefName as keyof typeof JobRequestFields]}
    `
}

/**
 * Build entity reference field fragment
 */
const buildEntityReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string,
  refFragment: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) {
    return ''
  }
  const hasObject = fieldSet.has(fieldName)
  return `
      ${hasObject ? `${fieldKey} { ${refFragment} }` : ''}
      ${JobRequestFields[fieldRefName as keyof typeof JobRequestFields]}
    `
}

/**
 * Build JobRequest Query Fragment from field array
 */
export const buildJobRequestFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)

  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildCatalogReferenceField(fieldSet, 'jobRequestStatus', 'jobRequestStatusRef', JobRequestFields.jobRequestStatus)}
    
    ${buildCatalogReferenceField(fieldSet, 'jobRequestType', 'jobRequestTypeRef', JobRequestFields.jobRequestType)}
    
    ${buildCatalogReferenceField(fieldSet, 'priority', 'priorityRef', JobRequestFields.priority)}
    
    ${buildCatalogReferenceField(fieldSet, 'department', 'departmentRef', JobRequestFields.department)}
    
    ${buildEntityReferenceField(fieldSet, 'requestedByEmployee', 'requestedByEmployeeId', JobRequestFields.requestedByEmployee, EMPLOYEE_REF)}
    
    ${buildEntityReferenceField(fieldSet, 'jobPosition', 'jobPositionId', JobRequestFields.jobPosition, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'approvedByEmployee', 'approvedByEmployeeId', JobRequestFields.approvedByEmployee, EMPLOYEE_REF)}
  `
}
