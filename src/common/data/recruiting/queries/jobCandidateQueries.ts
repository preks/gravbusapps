/**
 * JobCandidate Queries
 */
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { JobCandidateFields } from '../types/jobCandidateTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { buildJobCandidateDocumentFragment, JOB_CANDIDATE_DOCUMENT_QUERY_CONFIGS } from './jobCandidateDocumentQueries'

export interface JobCandidateQueryVariables extends BaseQueryVariables {
  jobCandidateStatus?: string
  academicTitleRef?: string
  genderRef?: string
  nationalityRef?: string
  userId?: string
}

export const JOB_CANDIDATE_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['code', 'createdAt', 'id', 'firstName', 'lastName'],
  list: [
    'code',
    'createdAt',
    'id',
    'firstName',
    'lastName',
    'academicTitle',
    'academicTitleRef',
    'birthDate',
    'email', // Deprecated but might still be in backend
    'phone', // Deprecated but might still be in backend
    'updatedAt',
    'applicationCount'
  ],
  record: [
    'code',
    'createdAt',
    'createdBy',
    'id',
    // Name fields
    'title',
    'firstName',
    'lastName',
    'birthName',
    'preferredName',
    'fullName',
    'displayName',
    // Personal information
    'birthPlace',
    'birthDate',
    'picture',
    'pictureThumbnail',
    'severelyDisabilityDegree',
    'notes',
    'children',
    // Catalog references
    'academicTitle',
    'academicTitleRef',
    'ethnicity',
    'ethnicityRef',
    'gender',
    'genderRef',
    'language',
    'languageRef',
    'maritalStatus',
    'maritalStatusRef',
    'nationality',
    'nationalityRef',
    'salutation',
    'salutationRef',
    'schoolQualification',
    'schoolQualificationRef',
    // Jsonb fields
    'addresses',
    'skills',
    'certificates',
    'communicationChannels',
    'educations',
    'hobbies',
    'jobHistory',
    // Old deprecated fields (might still be in backend)
    'email',
    'phone',
    'linkedinUrl',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties',
    'applicationCount',
    // Relations
    'jobCandidateDocument'
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
    { key: 'code', value: JobCandidateFields.code },
    // Name fields
    { key: 'title', value: JobCandidateFields.title },
    { key: 'firstName', value: JobCandidateFields.firstName },
    { key: 'lastName', value: JobCandidateFields.lastName },
    { key: 'birthName', value: JobCandidateFields.birthName },
    { key: 'preferredName', value: JobCandidateFields.preferredName },
    { key: 'fullName', value: JobCandidateFields.fullName },
    { key: 'displayName', value: JobCandidateFields.displayName },
    // Personal information
    { key: 'birthPlace', value: JobCandidateFields.birthPlace },
    { key: 'birthDate', value: JobCandidateFields.birthDate },
    { key: 'picture', value: JobCandidateFields.picture },
    { key: 'pictureThumbnail', value: JobCandidateFields.pictureThumbnail },
    { key: 'severelyDisabilityDegree', value: JobCandidateFields.severelyDisabilityDegree },
    { key: 'notes', value: JobCandidateFields.notes },
    { key: 'children', value: JobCandidateFields.children },
    // Status
    { key: 'jobCandidateStatus', value: JobCandidateFields.jobCandidateStatus },
    { key: 'userId', value: JobCandidateFields.userId },
    // Catalog ref IDs
    { key: 'academicTitleRef', value: JobCandidateFields.academicTitleRef },
    { key: 'ethnicityRef', value: JobCandidateFields.ethnicityRef },
    { key: 'genderRef', value: JobCandidateFields.genderRef },
    { key: 'languageRef', value: JobCandidateFields.languageRef },
    { key: 'maritalStatusRef', value: JobCandidateFields.maritalStatusRef },
    { key: 'nationalityRef', value: JobCandidateFields.nationalityRef },
    { key: 'salutationRef', value: JobCandidateFields.salutationRef },
    { key: 'schoolQualificationRef', value: JobCandidateFields.schoolQualificationRef },
    // Jsonb fields
    { key: 'addresses', value: JobCandidateFields.addresses },
    { key: 'skills', value: JobCandidateFields.skills },
    { key: 'certificates', value: JobCandidateFields.certificates },
    { key: 'communicationChannels', value: JobCandidateFields.communicationChannels },
    { key: 'educations', value: JobCandidateFields.educations },
    { key: 'hobbies', value: JobCandidateFields.hobbies },
    { key: 'jobHistory', value: JobCandidateFields.jobHistory },
    // Audit
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
    aggregateFields.push('jobApplicationAggregate(where: {isDeleted: {_eq: false}}) { aggregate { count } }')
  }

  return aggregateFields.join('\n    ')
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
      ${JobCandidateFields[fieldRefName as keyof typeof JobCandidateFields]}
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

export const buildJobCandidateFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  const documentFragment = buildJobCandidateDocumentFragment(JOB_CANDIDATE_DOCUMENT_QUERY_CONFIGS.list)

  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    ${buildAggregateFields(fieldSet)}
    
    ${buildCatalogReferenceField(fieldSet, 'academicTitle', 'academicTitleRef', JobCandidateFields.academicTitle)}
    
    ${buildCatalogReferenceField(fieldSet, 'ethnicity', 'ethnicityRef', JobCandidateFields.ethnicity)}
    
    ${buildCatalogReferenceField(fieldSet, 'gender', 'genderRef', JobCandidateFields.gender)}
    
    ${buildCatalogReferenceField(fieldSet, 'language', 'languageRef', JobCandidateFields.language)}
    
    ${buildCatalogReferenceField(fieldSet, 'maritalStatus', 'maritalStatusRef', JobCandidateFields.maritalStatus)}
    
    ${buildCatalogReferenceField(fieldSet, 'nationality', 'nationalityRef', JobCandidateFields.nationality)}
    
    ${buildCatalogReferenceField(fieldSet, 'salutation', 'salutationRef', JobCandidateFields.salutation)}
    
    ${buildCatalogReferenceField(fieldSet, 'schoolQualification', 'schoolQualificationRef', JobCandidateFields.schoolQualification)}
    
    ${buildArrayRelationField(fieldSet, 'jobCandidateDocument', documentFragment)}
  `
}
