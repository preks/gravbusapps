/**
 * Recruiting Constants
 * Catalog references and field mappings
 */

export const RECRUITING_CATALOGS = {
  // Job Request related
  CONTRACT_TYPE: 'ContractType',
  EMPLOYMENT_TYPE: 'EmploymentType',
  JOB_EXPERIENCE_LEVEL: 'JobExperienceLevel',

  // Job Candidate related
  ACADEMIC_TITLE: 'AcademicTitle',
  ETHNICITY: 'Ethnicity',
  GENDER: 'Gender',
  LANGUAGES: 'Languages',
  MARITAL_STATUS: 'MaritalStatus',
  NATIONALITY: 'Nationality',
  SALUTATION: 'Salutation',
  SCHOOL_QUALIFICATION: 'SchoolQualification',
  COUNTRY: 'Country',
  COUNTRY_REGION: 'CountryRegion',
  COMMUNICATION_CHANNEL: 'CommunicationChannel',

  // Job Application related
  JOB_APPLICATION_PIPELINE: 'JobApplicationPipeline',
  JOB_APPLICATION_STAGE: 'JobApplicationStage',

  // Job Posting related
  JOB_POSTING_CHANNEL: 'JobPostingChannel',

  // Job Candidate Document related
  JOB_CANDIDATE_DOCUMENT_GROUP: 'JobCandidateDocumentGroup',
  JOB_CANDIDATE_DOCUMENT_TYPE: 'JobCandidateDocumentType',

  // Deprecated catalogs (kept for backward compatibility)
  /** @deprecated Use enum JobRequestStatus instead */
  JOB_REQUEST_STATUS: 'JobRequestStatus',
  /** @deprecated Use enum JobRequestType instead */
  JOB_REQUEST_TYPE: 'JobRequestType',
  /** @deprecated Use enum JobRequestType instead */
  JOB_REQUEST_REASON: 'JobRequestReason',
  /** @deprecated Use JOB_EXPERIENCE_LEVEL instead */
  EXPERIENCE_LEVEL: 'ExperienceLevelCatalog',
  /** @deprecated Not used anymore */
  INTERVIEW_TYPE: 'InterviewType',
  /** @deprecated Use JOB_APPLICATION_STAGE instead */
  APPLICATION_STAGE: 'ApplicationStage',
  /** @deprecated Not used anymore */
  CANDIDATE_STATUS: 'CandidateStatus',
  /** @deprecated Not used anymore */
  SOURCE: 'Source',
  /** @deprecated Not used anymore */
  PRIORITY: 'Priority',
  /** @deprecated Not used anymore */
  DEPARTMENT: 'Department',
  /** @deprecated Not used anymore */
  JOB_POSTING_STATUS: 'JobPostingStatus',
  /** @deprecated Not used anymore */
  JOB_POSTING_TYPE: 'JobPostingType',
  /** @deprecated Not used anymore */
  LOCATION: 'Location',
  /** @deprecated Not used anymore */
  APPLICATION_STATUS: 'ApplicationStatus'
} as const

/**
 * @deprecated Job Request Reason is now an enum (JobRequestType)
 * Use JobRequestType.NEW or JobRequestType.REPLACEMENT instead
 *
 * This is kept for backward compatibility during migration only
 */
export const JOB_REQUEST_REASON_VALUES = {
  /** @deprecated Use JobRequestType.REPLACEMENT */
  REPLACEMENT: 'JobRequestReason:v1:1',
  /** @deprecated Use JobRequestType.NEW */
  NEW: 'JobRequestReason:v1:2'
} as const
