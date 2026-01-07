import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { DOCUMENT_REF } from '@/common/data/common/queries/documentFragments'
/**
 * COMMON_ACCOUNT_FIELDS
 *
 * Fields marked with // IRM | CRM in commonAccountTypes.ts:
 * - addresses (any[] - excluded)
 * - code
 * - communicationChannels (CommunicationChannel[] - excluded)
 * - documents (any[] - excluded)
 * - foundationDate
 * - legalForm + legalFormRef
 * - liquidationDate
 * - name
 * - notes (any[] - excluded)
 * - notesSummary
 * - ownerEmployee + ownerEmployeeId
 * - tasks (any[] - excluded)
 * - timeZone + timeZoneRef
 */
export const COMMON_ACCOUNT_FIELDS = `
  ${AUDIT_FIELDS}
  code
  foundationDate
  id
  legalForm {
    ${CATALOG_ENTRY}
  }
  legalFormRef
  liquidationDate
  name
  notesSummary
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  timeZone {
    ${CATALOG_ENTRY}
  }
  timeZoneRef
`

// DEPRECATED: Use buildTaskFragment() from relationFragments.ts instead
// This fragment is kept for reference but should not be used in new code
export const COMMON_TASK_FIELDS = `
  ${AUDIT_FIELDS}
  # DEPRECATED: Multiple assignees now supported via taskAssignees
  # Use buildTaskFragment() which includes taskAssignees relationship
  code
  # TODO: comments missing
  creatorEmployee {
    ${EMPLOYEE_REF}
  }
  creatorEmployeeId
  creatorUserId # TODO: deprecated --> createdBy
  description
  dueDate
  endDate
  id
  name
  source
  startDate
  # TODO: taskPriority
  # TODO: taskPriorityRef
  # TODO: taskStatus
  # TODO: taskStatusRef
  # TODO: taskTiming
  # TODO: taskType
  # TODO: taskTypeRef
  templateStartDate
`

export const COMMON_TASK_TEMPLATE_FIELDS = `
    ${AUDIT_FIELDS}
    assigneeType
    code
    daysOfMonth
    daysOfWeek
    displayOrder
    durationDays
    enabled
    holidayPolicy
    id
    intervalDays
    monthsOfYear
    name
    nextStartDate
    priority {
      ${CATALOG_ENTRY}
    }
    priorityRef
    type {
      ${CATALOG_ENTRY}
    }
    typeRef
`

export const COMMON_TASK_COMMENT_FIELDS = `
    ${AUDIT_FIELDS}
    authorEmployee {
      ${EMPLOYEE_REF}
    }
    authorEmployeeId
    comment
    id
`

export const COMMON_CONTACT_FIELDS = `
  ${AUDIT_FIELDS}
  academicTitle {
    ${CATALOG_ENTRY}
  }
  academicTitleRef
  birthDate
  code
  department
  id
  firstName
  language {
    ${CATALOG_ENTRY}
  }
  languageRef
  lastName
  notesSummary
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  salutation {
    ${CATALOG_ENTRY}
  }
  salutationRef
`
// TODO: folder missing in DOCUMENT_REF
export const COMMON_DOCUMENT_FIELDS = `
  ${DOCUMENT_REF}
  
  # Source and verification fields
  source
  verified
  verificationDate
  authenticated
  authenticationDate
  mandatory
  expirationDate
`
export const COMMON_LEAD_FIELDS = `
  ${AUDIT_FIELDS}
  academicTitle {
    ${CATALOG_ENTRY}
  }
  academicTitleRef
  addressLine
  code
  companyEmail
  companyName
  companyPhone
  companyWebsite
  conversionDate
  country {
    ${CATALOG_ENTRY}
  }
  countryRef
  description
  email
  firstName
  id
  lastName
  leadRating {
    ${CATALOG_ENTRY}
  }
  leadRatingRef
  leadSource {
    ${CATALOG_ENTRY}
  }
  leadSourceRef
  leadStatus {
    ${CATALOG_ENTRY}
  }
  leadStatusRef
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  phoneNumber
  position
  postalCode
  region {
    ${CATALOG_ENTRY}
  }
  regionRef
  salutation { ${CATALOG_ENTRY} }
  salutationRef
  sensitive
  sourceCompanyName
  sourceIndividualName
`

export const COMMON_NOTE_FIELDS = `
  ${AUDIT_FIELDS}
  authorEmployee {
    ${EMPLOYEE_REF}
  }
  authorEmployeeId
  id
  reminderDate
  source
  # text missing in CRM
  # title missing in CRM
`
/**
 * COMMON_OPPORTUNITY_FIELDS
 *
 * Fields marked with // IRM | CRM in commonOpportunityTypes.ts:
 * - account (any - excluded)
 * - accountId (excluded - Id suffix)
 * - activities (any[] - excluded)
 * - addresses (any[] - excluded)
 * - closeDate
 * - code
 * - communicationChannels (CommunicationChannel[] - excluded)
 * - currency + currencyRef
 * - documents (any[] - excluded)
 * - estimatedAmount
 * - name
 * - notes (any[] - excluded)
 * - notesSummary
 * - opportunityStatus + opportunityStatusRef
 * - ownerEmployee + ownerEmployeeId
 * - rejectionReasons (any[] - excluded)
 * - tasks (any[] - excluded)
 * - winningChance
 */
export const COMMON_OPPORTUNITY_FIELDS = `
  ${AUDIT_FIELDS}
  closeDate
  code
  currency {
    ${CATALOG_ENTRY}
  }
  currencyRef
  id
  estimatedAmount
  name
  notesSummary
  opportunityStatus {
    ${CATALOG_ENTRY}
  }
  opportunityStatusRef
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  winningChance
`

/**
 * COMMON_OPPORTUNITY_STAGE_CONDITION_REF
 *
 * Fields marked with // IRM | CRM in OpportunityStageCondition:
 * - completed
 * - completedAt
 * - completedByEmployee + completedByEmployeeId
 * - configSnapshot
 * - deadlineAt
 * - opportunity (any - excluded)
 * - opportunityId (excluded - Id suffix)
 * - opportunityPipelineStageCondition + opportunityPipelineStageConditionRef (IRM | TODO)
 * - task (any - excluded)
 * - taskId (excluded - Id suffix)
 */
export const COMMON_OPPORTUNITY_STAGE_CONDITION_REF = `
  ${AUDIT_FIELDS}
  completed
  completedAt
  id
  completedByEmployee {
    ${EMPLOYEE_REF}
  }
  completedByEmployeeId
  configSnapshot
  deadlineAt
`

export const COMMON_ACTIVITY_FIELDS = `
  ${AUDIT_FIELDS}
  activityType {
    ${CATALOG_ENTRY}
  }
  activityTypeRef
  completedAt
  description
  id
  occurredAt
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  source
  title
`
