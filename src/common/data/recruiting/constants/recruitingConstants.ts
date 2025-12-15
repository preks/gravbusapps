/**
 * Recruiting Constants
 * Catalog references and field mappings
 */

export const RECRUITING_CATALOGS = {
  JOB_REQUEST_STATUS: 'JobRequestStatus',
  JOB_REQUEST_TYPE: 'JobRequestType',
  PRIORITY: 'Priority',
  DEPARTMENT: 'Department',
  JOB_POSTING_STATUS: 'JobPostingStatus',
  JOB_POSTING_TYPE: 'JobPostingType',
  LOCATION: 'Location',
  EMPLOYMENT_TYPE: 'EmploymentType',
  CONTRACT_TYPE: 'ContractType',
  CANDIDATE_STATUS: 'CandidateStatus',
  SOURCE: 'Source',
  ACADEMIC_TITLE: 'AcademicTitle',
  APPLICATION_STATUS: 'ApplicationStatus',
  APPLICATION_STAGE: 'ApplicationStage',
  JOB_REQUISITION_REASON: 'JobRequisitionReasonCatalog',
  EXPERIENCE_LEVEL: 'ExperienceLevelCatalog'
} as const

/**
 * Job Requisition Reason Catalog Values
 * Full catalog entry identifiers in format: CatalogName:Version:Code
 *
 * Catalog: JobRequisitionReasonCatalog
 * Version: v1
 */
export const JOB_REQUISITION_REASON_VALUES = {
  REPLACEMENT: 'JobRequisitionReasonCatalog:v1:1',
  NEW: 'JobRequisitionReasonCatalog:v1:2'
} as const
