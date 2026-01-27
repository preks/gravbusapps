/**
 * JobRequest Queries
 * GraphQL fragment builder for JobRequest entities
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobRequestFields } from '../types/jobRequestTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { buildJobPostingFragment, JOB_POSTING_QUERY_CONFIGS } from './jobPostingQueries'

/**
 * JobRequest Query Variables
 */
export interface JobRequestQueryVariables extends BaseQueryVariables {
  contractTypeRef?: string
  employmentTypeRef?: string
  jobExperienceLevelRef?: string
  costCenterId?: string
  jobProfileId?: string
  jobPositionId?: string
  organizationalUnitId?: string
  companyId?: string
  siteLocationId?: string
  requesterEmployeeId?: string
  jobRequestType?: string
  jobRequestStatus?: string | string[]
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
    'description',
    'plannedHireDate',
    'plannedExitDate',
    'jobRequestType',
    'jobRequestStatus',
    'contractType',
    'contractTypeRef',
    'employmentType',
    'employmentTypeRef',
    'jobExperienceLevel',
    'jobExperienceLevelRef',
    'organizationalUnit',
    'organizationalUnitId',
    'company',
    'companyId',
    'jobPosition',
    'jobPositionId',
    'requesterEmployee',
    'requesterEmployeeId',
    'jobProfile',
    'jobProfileId',
    'costCenter',
    'costCenterId',
    'siteLocation',
    'siteLocationId',
    'updatedAt'
  ],
  record: [
    'code',
    'createdAt',
    'createdBy',
    'id',
    'name',
    'description',
    'plannedHireDate',
    'plannedExitDate',
    'jobRequestType',
    'jobRequestStatus',
    'contractType',
    'contractTypeRef',
    'employmentType',
    'employmentTypeRef',
    'jobExperienceLevel',
    'jobExperienceLevelRef',
    'organizationalUnit',
    'organizationalUnitId',
    'company',
    'companyId',
    'costCenter',
    'costCenterId',
    'siteLocation',
    'siteLocationId',
    'jobProfile',
    'jobProfileId',
    'jobPosition',
    'jobPositionId',
    'requesterEmployee',
    'requesterEmployeeId',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties',
    'jobPostings',
    'jobRequestPositions'
  ]
}

/**
 * Build scalar fields fragment
 * Note: Audit fields (createdAt, createdBy, updatedAt, updatedBy, isDeleted, recordState, activeFrom, activeTo, version)
 * are excluded here since they're already included in AUDIT_FIELDS to avoid duplicates
 */
const buildScalarFields = (fieldSet: Set<string>): string => {
  // Audit fields that are already included in AUDIT_FIELDS
  const auditFields = new Set([
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'isDeleted',
    'recordState',
    'activeFrom',
    'activeTo',
    'version'
  ])

  const scalarFields = [
    { key: 'id', value: 'id' },
    { key: 'version', value: 'version' },
    { key: 'code', value: JobRequestFields.code },
    { key: 'name', value: JobRequestFields.name },
    { key: 'description', value: JobRequestFields.description },
    { key: 'plannedHireDate', value: JobRequestFields.plannedHireDate },
    { key: 'plannedExitDate', value: JobRequestFields.plannedExitDate },
    { key: 'jobRequestType', value: JobRequestFields.jobRequestType },
    { key: 'jobRequestStatus', value: JobRequestFields.jobRequestStatus },
    { key: 'createdAt', value: 'createdAt' },
    { key: 'createdBy', value: 'createdBy' },
    { key: 'updatedAt', value: 'updatedAt' },
    { key: 'updatedBy', value: 'updatedBy' },
    { key: 'isDeleted', value: 'isDeleted' },
    { key: 'recordState', value: 'recordState' },
    { key: 'activeFrom', value: 'activeFrom' },
    { key: 'activeTo', value: 'activeTo' },
    { key: 'jobProfileId', value: JobRequestFields.jobProfileId },
    { key: 'jobPositionId', value: JobRequestFields.jobPositionId },
    { key: 'costCenterId', value: JobRequestFields.costCenterId },
    { key: 'companyId', value: JobRequestFields.companyId },
    { key: 'siteLocationId', value: JobRequestFields.siteLocationId },
    { key: 'organizationalUnitId', value: JobRequestFields.organizationalUnitId },
    { key: 'requesterEmployeeId', value: JobRequestFields.requesterEmployeeId },
    { key: 'additionalProperties', value: 'additionalProperties' }
  ]

  return scalarFields
    .filter(field => fieldSet.has(field.key) && !auditFields.has(field.key))
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
 * Build JobRequestPosition fragment (JobRequestPosition has jobPositionId and jobRequestId, NOT jobPostingId)
 */
const buildJobRequestPositionFragment = (): string => {
  return `
    ${AUDIT_FIELDS}
    id
    jobPositionId
    jobRequestId
    jobPosition {
      id
      name
    }
  `
}

/**
 * Build array relation field fragment
 */
const buildArrayRelationField = (fieldSet: Set<string>, fieldName: string, relationFragment: string): string => {
  if (!fieldSet.has(fieldName)) {
    return ''
  }
  return `
    ${fieldName}(where: {isDeleted: {_eq: false}}, orderBy: {createdAt: DESC_NULLS_LAST}) {
      ${relationFragment}
    }
  `
}

/**
 * Build JobRequest Query Fragment from field array
 */
export const buildJobRequestFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  const postingFragment = buildJobPostingFragment(JOB_POSTING_QUERY_CONFIGS.list)
  const positionFragment = buildJobRequestPositionFragment()

  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildCatalogReferenceField(fieldSet, 'contractType', 'contractTypeRef', JobRequestFields.contractType)}
    
    ${buildCatalogReferenceField(fieldSet, 'employmentType', 'employmentTypeRef', JobRequestFields.employmentType)}
    
    ${buildCatalogReferenceField(fieldSet, 'jobExperienceLevel', 'jobExperienceLevelRef', JobRequestFields.jobExperienceLevel)}
    
    ${buildEntityReferenceField(fieldSet, 'organizationalUnit', 'organizationalUnitId', JobRequestFields.organizationalUnit, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'company', 'companyId', JobRequestFields.company, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'costCenter', 'costCenterId', JobRequestFields.costCenter, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'siteLocation', 'siteLocationId', JobRequestFields.siteLocation, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'jobProfile', 'jobProfileId', JobRequestFields.jobProfile, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'jobPosition', 'jobPositionId', JobRequestFields.jobPosition, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'requesterEmployee', 'requesterEmployeeId', JobRequestFields.requesterEmployee, 'id\n      firstName\n      lastName')}
    
    ${buildArrayRelationField(fieldSet, 'jobPostings', postingFragment)}
    
    ${buildArrayRelationField(fieldSet, 'jobRequestPositions', positionFragment)}
  `
}
