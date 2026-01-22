import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { JobCandidateStatus } from './enums'

/**
 * Address structure for jsonb field
 */
export interface CandidateAddress {
  addressLine?: any
  postalCode?: string
  locality?: string
  regionRef?: string
  countryRef?: string
}

/**
 * Skill structure for jsonb field
 */
export interface CandidateSkill {
  skillId?: string
  skillName?: string
  level?: string
}

/**
 * Certificate structure for jsonb field
 */
export interface CandidateCertificate {
  title?: string
  institute?: string
  validFrom?: string
  validTo?: string
  locality?: string
  verificationDocumentId?: string
}

/**
 * Communication channel structure for jsonb field
 */
export interface CandidateCommunicationChannel {
  communicationChannelRef?: string
  value?: string
  valueExtension?: string
}

/**
 * Education structure for jsonb field
 */
export interface CandidateEducation {
  title?: string
  institute?: string
  degree?: string
  startDate?: string
  endDate?: string
  locality?: string
  regionRef?: string
  countryRef?: string
  verificationDocumentId?: string
}

/**
 * Hobby structure for jsonb field
 */
export interface CandidateHobby {
  hobby?: string
}

/**
 * Job history structure for jsonb field
 */
export interface CandidateJobHistory {
  jobPosition?: string
  company?: string
  hireDate?: string
  exitDate?: string
}

/**
 * JobCandidate Type
 */
export interface JobCandidate extends BaseEntity {
  id?: string
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

  // Catalog objects
  academicTitle?: CatalogEntry
  ethnicity?: CatalogEntry
  gender?: CatalogEntry
  language?: CatalogEntry
  maritalStatus?: CatalogEntry
  nationality?: CatalogEntry
  salutation?: CatalogEntry
  schoolQualification?: CatalogEntry

  // Jsonb fields (merged from separate tables)
  addresses?: CandidateAddress[]
  skills?: CandidateSkill[]
  certificates?: CandidateCertificate[]
  communicationChannels?: CandidateCommunicationChannel[]
  educations?: CandidateEducation[]
  hobbies?: CandidateHobby[]
  jobHistory?: CandidateJobHistory[]

  // Aggregate counts
  applicationCount?: number
}

/**
 * JobCandidate Fields
 */
export const JobCandidateFields = {
  id: 'id',
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

  // Catalog objects
  academicTitle: 'academicTitle',
  ethnicity: 'ethnicity',
  gender: 'gender',
  language: 'language',
  maritalStatus: 'maritalStatus',
  nationality: 'nationality',
  salutation: 'salutation',
  schoolQualification: 'schoolQualification',

  // Jsonb fields
  addresses: 'addresses',
  skills: 'skills',
  certificates: 'certificates',
  communicationChannels: 'communicationChannels',
  educations: 'educations',
  hobbies: 'hobbies',
  jobHistory: 'jobHistory'
} as const

/**
 * JobCandidate Descriptors
 */
export const JOB_CANDIDATE_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'title', searchPaths: ['title'], sortPath: 'title', type: 'text' },
  { key: 'firstName', searchPaths: ['firstName'], sortPath: 'firstName', type: 'text' },
  { key: 'lastName', searchPaths: ['lastName'], sortPath: 'lastName', type: 'text' },
  { key: 'birthName', searchPaths: ['birthName'], sortPath: 'birthName', type: 'text' },
  { key: 'preferredName', searchPaths: ['preferredName'], sortPath: 'preferredName', type: 'text' },
  { key: 'fullName', searchPaths: ['fullName'], sortPath: 'fullName', type: 'text' },
  { key: 'displayName', searchPaths: ['displayName'], sortPath: 'displayName', type: 'text' },
  { key: 'birthPlace', searchPaths: ['birthPlace'], sortPath: 'birthPlace', type: 'text' },
  { key: 'birthDate', searchPaths: ['birthDate'], sortPath: 'birthDate', type: 'date' },
  { key: 'jobCandidateStatus', searchPaths: ['jobCandidateStatus'], sortPath: 'jobCandidateStatus', type: 'text' },
  {
    key: 'academicTitle',
    searchPaths: ['academicTitle.value'],
    sortPath: 'academicTitle.value',
    type: 'text'
  },
  {
    key: 'gender',
    searchPaths: ['gender.value'],
    sortPath: 'gender.value',
    type: 'text'
  },
  {
    key: 'nationality',
    searchPaths: ['nationality.value'],
    sortPath: 'nationality.value',
    type: 'text'
  }
]
