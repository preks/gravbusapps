/**
 * JobCandidateDocument Queries
 */
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { JobCandidateDocumentFields } from '../types/jobCandidateDocumentTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobCandidateDocumentQueryVariables extends BaseQueryVariables {
  jobCandidateId?: string
  documentGroupRef?: string
  documentTypeRef?: string
  mandatory?: boolean
  authenticated?: boolean
  verified?: boolean
}

export const JOB_CANDIDATE_DOCUMENT_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'name'],
  list: [
    'createdAt',
    'id',
    'name',
    'documentGroup',
    'documentGroupRef',
    'documentType',
    'documentTypeRef',
    'mandatory',
    'authenticated',
    'verified',
    'expirationDate',
    'jobCandidate',
    'jobCandidateId',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'name',
    'description',
    'fileInfo',
    'folder',
    'mandatory',
    'authenticated',
    'authenticationDate',
    'verified',
    'verificationDate',
    'expirationDate',
    'documentGroup',
    'documentGroupRef',
    'documentType',
    'documentTypeRef',
    'jobCandidate',
    'jobCandidateId',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties'
  ]
}

const buildScalarFields = (fieldSet: Set<string>): string => {
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
    { key: 'name', value: JobCandidateDocumentFields.name },
    { key: 'description', value: JobCandidateDocumentFields.description },
    { key: 'fileInfo', value: JobCandidateDocumentFields.fileInfo },
    { key: 'folder', value: JobCandidateDocumentFields.folder },
    { key: 'mandatory', value: JobCandidateDocumentFields.mandatory },
    { key: 'authenticated', value: JobCandidateDocumentFields.authenticated },
    { key: 'authenticationDate', value: JobCandidateDocumentFields.authenticationDate },
    { key: 'verified', value: JobCandidateDocumentFields.verified },
    { key: 'verificationDate', value: JobCandidateDocumentFields.verificationDate },
    { key: 'expirationDate', value: JobCandidateDocumentFields.expirationDate },
    { key: 'documentGroupRef', value: JobCandidateDocumentFields.documentGroupRef },
    { key: 'documentTypeRef', value: JobCandidateDocumentFields.documentTypeRef },
    { key: 'jobCandidateId', value: JobCandidateDocumentFields.jobCandidateId },
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
    .filter(field => fieldSet.has(field.key) && !auditFields.has(field.key))
    .map(field => field.value)
    .join('\n    ')
}

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
      ${JobCandidateDocumentFields[fieldRefName as keyof typeof JobCandidateDocumentFields]}
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
      ${JobCandidateDocumentFields[fieldRefName as keyof typeof JobCandidateDocumentFields]}
    `
}

export const buildJobCandidateDocumentFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildCatalogReferenceField(fieldSet, 'documentGroup', 'documentGroupRef', JobCandidateDocumentFields.documentGroup)}
    
    ${buildCatalogReferenceField(fieldSet, 'documentType', 'documentTypeRef', JobCandidateDocumentFields.documentType)}
    
    ${buildEntityReferenceField(fieldSet, 'jobCandidate', 'jobCandidateId', JobCandidateDocumentFields.jobCandidate, 'id\n      firstName\n      lastName\n      displayName')}
  `
}
