/**
 * JobPosting Queries
 */
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { JobPostingFields } from '../types/jobPostingTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobPostingQueryVariables extends BaseQueryVariables {
  jobPostingStatusRef?: string
  jobPostingTypeRef?: string
  locationRef?: string
  employmentTypeRef?: string
  contractTypeRef?: string
  jobRequestId?: string
  createdByEmployeeId?: string
}

export const JOB_POSTING_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['code', 'createdAt', 'id', 'title'],
  list: [
    'code',
    'createdAt',
    'id',
    'title',
    'publishedDate',
    'closingDate',
    'isPublished',
    'jobPostingStatus',
    'jobPostingStatusRef',
    'createdByEmployee',
    'createdByEmployeeId',
    'jobRequest',
    'jobRequestId',
    'updatedAt'
  ],
  record: [
    'code',
    'createdAt',
    'createdBy',
    'id',
    'title',
    'description',
    'requirements',
    'publishedDate',
    'closingDate',
    'isPublished',
    'jobPostingStatus',
    'jobPostingStatusRef',
    'jobPostingType',
    'jobPostingTypeRef',
    'location',
    'locationRef',
    'employmentType',
    'employmentTypeRef',
    'contractType',
    'contractTypeRef',
    'jobRequest',
    'jobRequestId',
    'createdByEmployee',
    'createdByEmployeeId',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties'
  ]
}

const buildScalarFields = (fieldSet: Set<string>): string => {
  const scalarFields = [
    { key: 'id', value: 'id' },
    { key: 'version', value: 'version' },
    { key: 'code', value: JobPostingFields.code },
    { key: 'title', value: JobPostingFields.title },
    { key: 'description', value: JobPostingFields.description },
    { key: 'requirements', value: JobPostingFields.requirements },
    { key: 'publishedDate', value: JobPostingFields.publishedDate },
    { key: 'closingDate', value: JobPostingFields.closingDate },
    { key: 'isPublished', value: JobPostingFields.isPublished },
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

const buildCatalogReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) return ''
  const hasObject = fieldSet.has(fieldName)
  return `
      ${hasObject ? `${fieldKey} { ${CATALOG_ENTRY} }` : ''}
      ${JobPostingFields[fieldRefName as keyof typeof JobPostingFields]}
    `
}

const buildEntityReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string,
  refFragment: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) return ''
  const hasObject = fieldSet.has(fieldName)
  return `
      ${hasObject ? `${fieldKey} { ${refFragment} }` : ''}
      ${JobPostingFields[fieldRefName as keyof typeof JobPostingFields]}
    `
}

export const buildJobPostingFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    ${buildCatalogReferenceField(fieldSet, 'jobPostingStatus', 'jobPostingStatusRef', JobPostingFields.jobPostingStatus)}
    ${buildCatalogReferenceField(fieldSet, 'jobPostingType', 'jobPostingTypeRef', JobPostingFields.jobPostingType)}
    ${buildCatalogReferenceField(fieldSet, 'location', 'locationRef', JobPostingFields.location)}
    ${buildCatalogReferenceField(fieldSet, 'employmentType', 'employmentTypeRef', JobPostingFields.employmentType)}
    ${buildCatalogReferenceField(fieldSet, 'contractType', 'contractTypeRef', JobPostingFields.contractType)}
    ${buildEntityReferenceField(fieldSet, 'jobRequest', 'jobRequestId', JobPostingFields.jobRequest, 'id\n      code\n      title')}
    ${buildEntityReferenceField(fieldSet, 'createdByEmployee', 'createdByEmployeeId', JobPostingFields.createdByEmployee, EMPLOYEE_REF)}
  `
}
