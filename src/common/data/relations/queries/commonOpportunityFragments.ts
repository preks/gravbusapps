/**
 * Common Opportunity Fragments
 *
 * Contains ONLY fields marked with // IRM | CRM in commonOpportunityTypes.ts
 * These are fields that exist in BOTH schemas with IDENTICAL names.
 *
 * Excluded:
 * - any types (except Employee, CatalogEntry)
 * - Fields with Id suffix (except id and ownerEmployeeId)
 * - Fields with different names between schemas (handled in domain-specific fragments)
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

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
 * Fields marked with // IRM | CRM in CommonOpportunityStageCondition:
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
