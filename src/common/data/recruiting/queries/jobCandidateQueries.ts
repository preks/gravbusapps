/**
 * JobCandidate Queries
 */
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { JobCandidateFields } from '../types/jobCandidateTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobCandidateQueryVariables extends BaseQueryVariables {
  candidateStatusRef?: string
  sourceRef?: string
  academicTitleRef?: string
  createdByEmployeeId?: string
}

export const JOB_CANDIDATE_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['code', 'createdAt', 'id', 'firstName', 'lastName'],
  list: [
    'code',
    'createdAt',
    'id',
    'firstName',
    'lastName',
    'email',
    'phone',
    'candidateStatus',
    'candidateStatusRef',
    'source',
    'sourceRef',
    'createdByEmployee',
    'createdByEmployeeId',
    'updatedAt'
  ],
  record: [
    'code',
    'createdAt',
    'createdBy',
    'id',
    'firstName',
    'lastName',
    'email',
    'phone',
    'linkedinUrl',
    'resumeUrl',
    'coverLetterUrl',
    'candidateStatus',
    'candidateStatusRef',
    'source',
    'sourceRef',
    'academicTitle',
    'academicTitleRef',
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
    { key: 'code', value: JobCandidateFields.code },
    { key: 'firstName', value: JobCandidateFields.firstName },
    { key: 'lastName', value: JobCandidateFields.lastName },
    { key: 'email', value: JobCandidateFields.email },
    { key: 'phone', value: JobCandidateFields.phone },
    { key: 'linkedinUrl', value: JobCandidateFields.linkedinUrl },
    { key: 'resumeUrl', value: JobCandidateFields.resumeUrl },
    { key: 'coverLetterUrl', value: JobCandidateFields.coverLetterUrl },
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
      ${JobCandidateFields[fieldRefName as keyof typeof JobCandidateFields]}
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
      ${JobCandidateFields[fieldRefName as keyof typeof JobCandidateFields]}
    `
}

export const buildJobCandidateFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    ${buildCatalogReferenceField(fieldSet, 'candidateStatus', 'candidateStatusRef', JobCandidateFields.candidateStatus)}
    ${buildCatalogReferenceField(fieldSet, 'source', 'sourceRef', JobCandidateFields.source)}
    ${buildCatalogReferenceField(fieldSet, 'academicTitle', 'academicTitleRef', JobCandidateFields.academicTitle)}
    ${buildEntityReferenceField(fieldSet, 'createdByEmployee', 'createdByEmployeeId', JobCandidateFields.createdByEmployee, EMPLOYEE_REF)}
  `
}
