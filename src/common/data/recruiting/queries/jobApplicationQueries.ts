/**
 * JobApplication Queries
 */
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { JobApplicationFields } from '../types/jobApplicationTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { buildJobInterviewFragment, JOB_INTERVIEW_QUERY_CONFIGS } from './jobInterviewQueries'
import { buildJobOfferFragment, JOB_OFFER_QUERY_CONFIGS } from './jobOfferQueries'

export interface JobApplicationQueryVariables extends BaseQueryVariables {
  jobApplicationPipelineRef?: string
  jobApplicationStageRef?: string
  jobCandidateId?: string
  jobPostingId?: string
  jobPostingPublicationId?: string
  referrerEmployeeId?: string
}

export const JOB_APPLICATION_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'applicationDate'],
  list: [
    'createdAt',
    'id',
    'applicationDate',
    'jobApplicationStageRef',
    'jobCandidate',
    'jobCandidateId',
    'jobPosting',
    'jobPostingId',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'applicationDate',
    'jobApplicationStageRef',
    'jobCandidate',
    'jobCandidateId',
    'jobPosting',
    'jobPostingId',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties',
    'jobApplicationDocuments',
    'jobInterviews',
    'jobOffers'
  ],
  'interview-form': ['id', 'version', 'applicationDate', 'jobCandidate', 'jobCandidateId', 'jobPosting', 'jobPostingId']
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
    { key: 'applicationDate', value: JobApplicationFields.applicationDate },
    { key: 'jobApplicationPipelineRef', value: JobApplicationFields.jobApplicationPipelineRef },
    { key: 'jobApplicationStageRef', value: JobApplicationFields.jobApplicationStageRef },
    { key: 'jobCandidateId', value: JobApplicationFields.jobCandidateId },
    { key: 'jobPostingId', value: JobApplicationFields.jobPostingId },
    { key: 'jobPostingPublicationId', value: JobApplicationFields.jobPostingPublicationId },
    { key: 'referrerEmployeeId', value: JobApplicationFields.referrerEmployeeId },
    { key: 'referredBy', value: JobApplicationFields.referredBy },
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

export const buildJobApplicationFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)

  // Detect if this is the interview-form config by checking for its characteristic fields
  // interview-form has: id, version, applicationDate, jobCandidate, jobCandidateId, jobPosting, jobPostingId
  // and notably does NOT have: updatedAt, createdAt, etc.
  const isInterviewForm =
    fieldSet.has('jobCandidate') &&
    fieldSet.has('jobPosting') &&
    fieldSet.has('version') &&
    !fieldSet.has('updatedAt') &&
    !fieldSet.has('createdAt')

  // Determine fragment for jobCandidate
  const jobCandidateFragment = isInterviewForm
    ? 'id\n      code\n      firstName\n      lastName\n      displayName\n      userId\n      additionalProperties'
    : 'id\n      code\n      firstName\n      lastName'

  // Determine fragment for jobPosting
  const jobPostingFragment = isInterviewForm
    ? 'id\n      title\n      jobRequestId\n      jobRequest {\n        id\n        name\n        jobPositionId\n        jobPosition {\n          id\n          name\n        }\n      }'
    : 'id\n      title\n      jobRequestId\n      jobRequest {\n        companyId\n      }'

  // Build JobApplicationDocument fragment (has jobApplicationId, NOT jobCandidateId)
  const documentFragment = `
    ${AUDIT_FIELDS}
    id
    jobApplicationId
    description
    documentGroupRef
    documentTypeRef
    fileInfo
    folder
    authenticated
    authenticationDate
    expirationDate
    documentGroup {
      ${CATALOG_ENTRY}
    }
    documentType {
      ${CATALOG_ENTRY}
    }
  `
  const interviewFragment = buildJobInterviewFragment(JOB_INTERVIEW_QUERY_CONFIGS.list)
  const offerFragment = buildJobOfferFragment(JOB_OFFER_QUERY_CONFIGS.list)

  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildCatalogReferenceField(fieldSet, 'jobApplicationPipeline', 'jobApplicationPipelineRef', JobApplicationFields.jobApplicationPipeline)}
    
    ${buildCatalogReferenceField(fieldSet, 'jobApplicationStage', 'jobApplicationStageRef', JobApplicationFields.jobApplicationStage)}
    
    ${buildEntityReferenceField(fieldSet, 'jobCandidate', 'jobCandidateId', JobApplicationFields.jobCandidate, jobCandidateFragment)}
    
    ${buildEntityReferenceField(fieldSet, 'jobPosting', 'jobPostingId', JobApplicationFields.jobPosting, jobPostingFragment)}
    
    ${buildEntityReferenceField(fieldSet, 'jobPostingPublication', 'jobPostingPublicationId', JobApplicationFields.jobPostingPublication, 'id\n      url')}
    
    ${buildEntityReferenceField(fieldSet, 'referrerEmployee', 'referrerEmployeeId', JobApplicationFields.referrerEmployee, 'id\n      firstName\n      lastName')}
    
    ${buildArrayRelationField(fieldSet, 'jobApplicationDocuments', documentFragment)}
    
    ${buildArrayRelationField(fieldSet, 'jobInterviews', interviewFragment)}
    
    ${buildArrayRelationField(fieldSet, 'jobOffers', offerFragment)}
  `
}
