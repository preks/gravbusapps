/**
 * JobCandidate Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { JobCandidateStatus } from '../types/enums'
import type {
  CandidateAddress,
  CandidateSkill,
  CandidateCertificate,
  CandidateCommunicationChannel,
  CandidateEducation,
  CandidateHobby,
  CandidateJobHistory
} from '../types/jobCandidateTypes'

export interface JobCandidatePayload {
  id?: string
  version?: number
  code?: string

  // Name fields
  title?: string
  firstName: string
  lastName: string
  birthName?: string
  preferredName?: string
  fullName?: string
  displayName?: string

  // Personal information
  birthPlace?: string
  birthDate?: string
  picture?: any
  pictureThumbnail?: string
  severelyDisabilityDegree?: number
  notes?: string
  children?: number

  // Status and user
  jobCandidateStatus?: JobCandidateStatus
  userId?: string

  // Catalog references
  academicTitleRef?: string
  ethnicityRef?: string
  genderRef?: string
  languageRef?: string
  maritalStatusRef?: string
  nationalityRef?: string
  salutationRef?: string
  schoolQualificationRef?: string

  // Jsonb fields
  addresses?: CandidateAddress[]
  skills?: CandidateSkill[]
  certificates?: CandidateCertificate[]
  communicationChannels?: CandidateCommunicationChannel[]
  educations?: CandidateEducation[]
  hobbies?: CandidateHobby[]
  jobHistory?: CandidateJobHistory[]

  additionalProperties?: any
}

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

export const buildJobCandidatePayload = (data: any): JobCandidatePayload => {
  const payload = buildPayload(data, JobCandidateFormFields)

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
    if (payload[field as keyof JobCandidatePayload]) {
      // Ensure it's an array
      const value = payload[field as keyof JobCandidatePayload]
      if (!Array.isArray(value)) {
        payload[field as keyof JobCandidatePayload] = value ? [value] : []
      }
    }
  })

  return {
    ...payload,
    firstName: data.firstName || '',
    lastName: data.lastName || ''
  }
}
