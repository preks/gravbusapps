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
  requisitionStatus?: string
  reasonRef?: string
  contractTypeRef?: string
  experienceLevelRef?: string
  organizationalUnitId?: string
  jobPositionId?: string
  requesterId?: string
}

/**
 * Pre-defined Query Configurations
 */
export const JOB_REQUEST_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['code', 'createdAt', 'id', 'name'],
  list: [
    'code',
    'createdAt',
    'id',
    'name',
    'startDate',
    'endDate',
    'requisitionStatus',
    'organizationalUnit',
    'organizationalUnitId',
    'jobPosition',
    'jobPositionId',
    'requester',
    'requesterId',
    'updatedAt'
  ],
  record: [
    'code',
    'createdAt',
    'createdBy',
    'id',
    'name',
    'note',
    'headcount',
    'startDate',
    'endDate',
    'requisitionStatus',
    'reason',
    'reasonRef',
    'contractType',
    'contractTypeRef',
    'experienceLevel',
    'experienceLevelRef',
    'organizationalUnit',
    'organizationalUnitId',
    'jobPosition',
    'jobPositionId',
    'requester',
    'requesterId',
    'jobProfileId',
    'costCenterId',
    'replacedPositionId',
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
    { key: 'name', value: JobRequestFields.name },
    { key: 'note', value: JobRequestFields.note },
    { key: 'headcount', value: JobRequestFields.headcount },
    { key: 'startDate', value: JobRequestFields.startDate },
    { key: 'endDate', value: JobRequestFields.endDate },
    { key: 'requisitionStatus', value: JobRequestFields.requisitionStatus },
    { key: 'createdAt', value: 'createdAt' },
    { key: 'createdBy', value: 'createdBy' },
    { key: 'updatedAt', value: 'updatedAt' },
    { key: 'updatedBy', value: 'updatedBy' },
    { key: 'isDeleted', value: 'isDeleted' },
    { key: 'recordState', value: 'recordState' },
    { key: 'activeFrom', value: 'activeFrom' },
    { key: 'activeTo', value: 'activeTo' },
    { key: 'jobProfileId', value: JobRequestFields.jobProfileId },
    { key: 'costCenterId', value: JobRequestFields.costCenterId },
    { key: 'replacedPositionId', value: JobRequestFields.replacedPositionId },
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
    
    ${buildCatalogReferenceField(fieldSet, 'reason', 'reasonRef', JobRequestFields.reason)}
    
    ${buildCatalogReferenceField(fieldSet, 'contractType', 'contractTypeRef', JobRequestFields.contractType)}
    
    ${buildCatalogReferenceField(fieldSet, 'experienceLevel', 'experienceLevelRef', JobRequestFields.experienceLevel)}
    
    ${buildEntityReferenceField(fieldSet, 'organizationalUnit', 'organizationalUnitId', JobRequestFields.organizationalUnit, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'jobPosition', 'jobPositionId', JobRequestFields.jobPosition, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'requester', 'requesterId', JobRequestFields.requester, EMPLOYEE_REF)}
  `
}
