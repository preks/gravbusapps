/**
 * JobCandidate Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobCandidate } from '../types/jobCandidateTypes'

export const JobCandidateFormFields = {
  id: 'id',
  version: 'version',
  code: 'code',

  // Name fields
  title: 'title',
  firstName: 'firstName',
  lastName: 'lastName',
  birthName: 'birthName',
  preferredName: 'preferredName',
  fullName: 'fullName',
  displayName: 'displayName',

  // Personal information
  birthPlace: 'birthPlace',
  birthDate: 'birthDate',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  severelyDisabilityDegree: 'severelyDisabilityDegree',
  notes: 'notes',
  children: 'children',

  // Status and user
  jobCandidateStatus: 'jobCandidateStatus',
  userId: 'userId',

  // Catalog references
  academicTitleRef: 'academicTitleRef',
  ethnicityRef: 'ethnicityRef',
  genderRef: 'genderRef',
  languageRef: 'languageRef',
  maritalStatusRef: 'maritalStatusRef',
  nationalityRef: 'nationalityRef',
  salutationRef: 'salutationRef',
  schoolQualificationRef: 'schoolQualificationRef',

  // Jsonb fields
  addresses: 'addresses',
  skills: 'skills',
  certificates: 'certificates',
  communicationChannels: 'communicationChannels',
  educations: 'educations',
  hobbies: 'hobbies',
  jobHistory: 'jobHistory',

  additionalProperties: 'additionalProperties'
} as const

export const buildJobCandidatePayload = (data: Partial<JobCandidate>) => {
  const basePayload = buildPayload(data, JobCandidateFormFields)

  // Ensure jsonb fields are properly serialized
  const jsonbFields = [
    'addresses',
    'skills',
    'certificates',
    'communicationChannels',
    'educations',
    'hobbies',
    'jobHistory'
  ]
  jsonbFields.forEach(field => {
    if (basePayload[field]) {
      // Ensure it's an array
      const value = basePayload[field]
      if (!Array.isArray(value)) {
        basePayload[field] = value ? [value] : []
      }
    }
  })

  return {
    jobCandidate: {
      ...basePayload,
      firstName: data.firstName || '',
      lastName: data.lastName || ''
    }
  }
}
