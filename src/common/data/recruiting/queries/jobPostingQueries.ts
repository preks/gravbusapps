/**
 * JobPosting Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobPostingFields } from '../types/jobPostingTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { buildJobApplicationFragment, JOB_APPLICATION_QUERY_CONFIGS } from './jobApplicationQueries'
import { buildJobPostingPositionFragment, JOB_POSTING_POSITION_QUERY_CONFIGS } from './jobPostingPositionQueries'
import {
  buildJobPostingPublicationFragment,
  JOB_POSTING_PUBLICATION_QUERY_CONFIGS
} from './jobPostingPublicationQueries'

export interface JobPostingQueryVariables extends BaseQueryVariables {
  jobRequestId?: string
}

export const JOB_POSTING_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'title'],
  list: ['createdAt', 'id', 'title', 'updatedAt', 'applicationCount', 'positionCount', 'jobApplications'],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'title',
    'titleI18n',
    'content',
    'contentI18n',
    'fileInfo',
    'jobRequest',
    'jobRequestId',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties',
    'applicationCount',
    'positionCount',
    'jobApplications',
    'jobPostingPositions',
    'jobPostingPublications'
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
    { key: 'title', value: JobPostingFields.title },
    { key: 'titleI18n', value: JobPostingFields.titleI18n },
    { key: 'content', value: JobPostingFields.content },
    { key: 'contentI18n', value: JobPostingFields.contentI18n },
    { key: 'fileInfo', value: JobPostingFields.fileInfo },
    { key: 'jobRequestId', value: JobPostingFields.jobRequestId },
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

const buildAggregateFields = (fieldSet: Set<string>): string => {
  const aggregateFields: string[] = []

  if (fieldSet.has('applicationCount')) {
    aggregateFields.push('jobApplicationsAggregate(where: {isDeleted: {_eq: false}}) { aggregate { count } }')
  }

  if (fieldSet.has('positionCount')) {
    aggregateFields.push('jobPostingPositionsAggregate(where: {isDeleted: {_eq: false}}) { aggregate { count } }')
  }

  return aggregateFields.join('\n    ')
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

export const buildJobPostingFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  const applicationFragment = buildJobApplicationFragment(JOB_APPLICATION_QUERY_CONFIGS.list)
  const positionFragment = buildJobPostingPositionFragment(JOB_POSTING_POSITION_QUERY_CONFIGS.list)
  const publicationFragment = buildJobPostingPublicationFragment(JOB_POSTING_PUBLICATION_QUERY_CONFIGS.list)

  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    ${buildAggregateFields(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'jobRequest', 'jobRequestId', JobPostingFields.jobRequest, 'id\n      name\n      code\n      description\n      plannedHireDate\n      plannedExitDate\n      contractTypeRef\n      contractType {\n        id\n        code\n        value\n        translations {\n          localeCode\n          value\n        }\n      }\n      employmentTypeRef\n      employmentType {\n        id\n        code\n        value\n        translations {\n          localeCode\n          value\n        }\n      }\n      jobExperienceLevelRef\n      jobExperienceLevel {\n        id\n        code\n        value\n        translations {\n          localeCode\n          value\n        }\n      }\n      organizationalUnitId\n      organizationalUnit {\n        id\n        name\n      }\n      companyId\n      company {\n        id\n        name\n      }\n      costCenterId\n      costCenter {\n        id\n        name\n      }\n      siteLocationId\n      siteLocation {\n        id\n        name\n      }\n      jobProfileId\n      jobProfile {\n        id\n        name\n      }\n      jobPositionId\n      jobPosition {\n        id\n        name\n      }')}
    
    ${buildArrayRelationField(fieldSet, 'jobApplications', applicationFragment)}
    
    ${buildArrayRelationField(fieldSet, 'jobPostingPositions', positionFragment)}
    
    ${buildArrayRelationField(fieldSet, 'jobPostingPublications', publicationFragment)}
  `
}
