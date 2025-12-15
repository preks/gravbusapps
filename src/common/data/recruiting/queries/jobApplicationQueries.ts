/**
 * JobApplication Queries
 */
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { JobApplicationFields } from '../types/jobApplicationTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobApplicationQueryVariables extends BaseQueryVariables {
  applicationStatusRef?: string
  applicationStageRef?: string
  jobCandidateId?: string
  jobPostingId?: string
  reviewedByEmployeeId?: string
}

export const JOB_APPLICATION_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['code', 'createdAt', 'id', 'applicationDate'],
  list: [
    'code',
    'createdAt',
    'id',
    'applicationDate',
    'status',
    'applicationStatus',
    'applicationStatusRef',
    'applicationStage',
    'applicationStageRef',
    'jobCandidate',
    'jobCandidateId',
    'jobPosting',
    'jobPostingId',
    'updatedAt'
  ],
  record: [
    'code',
    'createdAt',
    'createdBy',
    'id',
    'applicationDate',
    'status',
    'notes',
    'applicationStatus',
    'applicationStatusRef',
    'applicationStage',
    'applicationStageRef',
    'jobCandidate',
    'jobCandidateId',
    'jobPosting',
    'jobPostingId',
    'reviewedByEmployee',
    'reviewedByEmployeeId',
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
    { key: 'code', value: JobApplicationFields.code },
    { key: 'applicationDate', value: JobApplicationFields.applicationDate },
    { key: 'status', value: JobApplicationFields.status },
    { key: 'notes', value: JobApplicationFields.notes },
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
      ${JobApplicationFields[fieldRefName as keyof typeof JobApplicationFields]}
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
      ${JobApplicationFields[fieldRefName as keyof typeof JobApplicationFields]}
    `
}

export const buildJobApplicationFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    ${buildCatalogReferenceField(fieldSet, 'applicationStatus', 'applicationStatusRef', JobApplicationFields.applicationStatus)}
    ${buildCatalogReferenceField(fieldSet, 'applicationStage', 'applicationStageRef', JobApplicationFields.applicationStage)}
    ${buildEntityReferenceField(fieldSet, 'jobCandidate', 'jobCandidateId', JobApplicationFields.jobCandidate, 'id\n      code\n      firstName\n      lastName\n      email')}
    ${buildEntityReferenceField(fieldSet, 'jobPosting', 'jobPostingId', JobApplicationFields.jobPosting, 'id\n      code\n      title')}
    ${buildEntityReferenceField(fieldSet, 'reviewedByEmployee', 'reviewedByEmployeeId', JobApplicationFields.reviewedByEmployee, EMPLOYEE_REF)}
  `
}
