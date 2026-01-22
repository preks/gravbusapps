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

  // Remove id and version if they don't exist (create mode)
  // Only include them for update mode
  if (!data.id) {
    delete basePayload.id
    delete basePayload.version
  }

  // Backend expects jsonb fields as objects, not arrays
  // Convert empty arrays to empty objects or remove them
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
    const value = basePayload[field]
    if (value !== undefined) {
      // If it's an empty array, convert to empty object
      if (Array.isArray(value) && value.length === 0) {
        basePayload[field] = {}
      } else if (Array.isArray(value)) {
        // Non-empty arrays stay as-is (backend might support them in some cases)
        basePayload[field] = value
      } else if (value === null) {
        // Remove null values
        delete basePayload[field]
      }
      // If it's already an object, leave it as-is
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
