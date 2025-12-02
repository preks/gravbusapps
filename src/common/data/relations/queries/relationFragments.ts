/**
 * Relation Fragments
 *
 * Consolidated fragment builders for all relation entities
 * Builds fragments using fields mapping to support different field names per domain (IRM vs CRM)
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { DOCUMENT_REF } from '@/common/data/common/queries/documentFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { AccountFields } from '../types/accountTypes'
import { ContactFields } from '../types/contactTypes'
import { ActivityFields } from '../types/activityTypes'
import { TaskFields } from '../types/taskTypes'
import { LeadFields } from '../types/leadTypes'
import { OpportunityFields } from '../types/opportunityTypes'
import { NoteFields } from '../types/noteTypes'
import { DocumentFields } from '../types/documentTypes'

/**
 * Build Account fragment using fields mapping (REF fields only, no relations)
 * @param fields - AccountFields mapping (default: AccountFields)
 * @param includeRelations - Optional: include website, communicationChannels, and addresses (default: false)
 * @param addressFragment - Optional: address fragment to use when includeRelations is true
 * @returns GraphQL fragment string with all account fields
 */
export const buildAccountFragment = (fields: Record<keyof typeof AccountFields, string> = AccountFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.accountAnnualRevenueBand} {
    ${CATALOG_ENTRY}
  }
  ${fields.accountAnnualRevenueBandRef}
  ${fields.code}
  ${fields.companySize} {
    ${CATALOG_ENTRY}
  }
  ${fields.companySizeRef}
  ${fields.foundationDate}
  ${fields.id}
  ${fields.industryClass} {
    ${CATALOG_ENTRY}
  }
  ${fields.industryClassRef}
  ${fields.legalForm} {
    ${CATALOG_ENTRY}
  }
  ${fields.legalFormRef}
  ${fields.liquidationDate}
  ${fields.name}
  ${fields.notesSummary}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.picture}
  ${fields.pictureThumbnail}
  ${fields.timeZone} {
    ${CATALOG_ENTRY}
  }
  ${fields.timeZoneRef}
  ${fields.website}
`
}

/**
 * Build Contact fragment using fields mapping (REF fields only, no relations)
 */
export const buildContactFragment = (fields: Record<keyof typeof ContactFields, string> = ContactFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.academicTitle} {
    ${CATALOG_ENTRY}
  }
  ${fields.academicTitleRef}
  ${fields.birthDate}
  ${fields.code}
  ${fields.department}
  ${fields.id}
  ${fields.firstName}
  ${fields.jobPosition}
  ${fields.language} {
    ${CATALOG_ENTRY}
  }
  ${fields.languageRef}
  ${fields.lastName}
  ${fields.notesSummary}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.pictureThumbnail}
  ${fields.salutation} {
    ${CATALOG_ENTRY}
  }
  ${fields.salutationRef}
  ${fields.type}
  ${fields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
    ${COMMUNICATION_CHANNEL_REF}
  }
`
}

/**
 * Build Activity fragment using fields mapping (REF fields only, no relations)
 */
export const buildActivityFragment = (fields: Record<keyof typeof ActivityFields, string> = ActivityFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.activityType} {
    ${CATALOG_ENTRY}
  }
  ${fields.activityTypeRef}
  ${fields.completedAt}
  ${fields.description}
  ${fields.id}
  ${fields.occurredAt}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.source}
  ${fields.title}
`
}

/**
 * Build Task fragment using fields mapping (REF fields only, no relations)
 */
export const buildTaskFragment = (fields: Record<keyof typeof TaskFields, string> = TaskFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.assignedEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.assignedEmployeeId}
  ${fields.assignedUserId}
  ${fields.code}
  # TODO: comments missing
  ${fields.creatorEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.creatorEmployeeId}
  ${fields.creatorUserId} # TODO: deprecated --> createdBy
  ${fields.description}
  ${fields.dueDate}
  ${fields.endDate}
  ${fields.id}
  ${fields.name}
  ${fields.source}
  ${fields.startDate}
  ${fields.taskPriority} {
    ${CATALOG_ENTRY}
  }
  ${fields.taskPriorityRef}
  ${fields.taskStatus} {
    ${CATALOG_ENTRY}
  }
  ${fields.taskStatusRef}
  ${fields.taskTiming}
  ${fields.taskType} {
    ${CATALOG_ENTRY}
  }
  ${fields.taskTypeRef}
  ${fields.templateStartDate}
`
}

/**
 * Build Lead fragment using fields mapping (REF fields only, no relations)
 */
export const buildLeadFragment = (fields: Record<keyof typeof LeadFields, string> = LeadFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.academicTitle} {
    ${CATALOG_ENTRY}
  }
  ${fields.academicTitleRef}
  ${fields.addressLine}
  ${fields.code}
  ${fields.companyEmail}
  ${fields.companyName}
  ${fields.companyPhone}
  ${fields.companyWebsite}
  ${fields.conversionDate}
  ${fields.country} {
    ${CATALOG_ENTRY}
  }
  ${fields.countryRef}
  ${fields.description}
  ${fields.email}
  ${fields.firstName}
  ${fields.id}
  ${fields.industryClass} {
    ${CATALOG_ENTRY}
  }
  ${fields.industryClassRef}
  ${fields.lastName}
  ${fields.leadRating} {
    ${CATALOG_ENTRY}
  }
  ${fields.leadRatingRef}
  ${fields.leadSource} {
    ${CATALOG_ENTRY}
  }
  ${fields.leadSourceRef}
  ${fields.leadStatus} {
    ${CATALOG_ENTRY}
  }
  ${fields.leadStatusRef}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.phoneNumber}
  ${fields.jobPosition}
  ${fields.postalCode}
  ${fields.region} {
    ${CATALOG_ENTRY}
  }
  ${fields.regionRef}
  ${fields.salutation} { ${CATALOG_ENTRY} }
  ${fields.salutationRef}
  ${fields.sensitive}
  ${fields.sourceCompanyName}
  ${fields.sourceIndividualName}
`
}

/**
 * Build Opportunity fragment using fields mapping (REF fields only, no relations)
 */
export const buildOpportunityFragment = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields
): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.closeDate}
  ${fields.code}
  ${fields.currency} {
    ${CATALOG_ENTRY}
  }
  ${fields.currencyRef}
  ${fields.id}
  ${fields.estimatedAmount}
  ${fields.name}
  ${fields.notesSummary}
  ${fields.opportunityStatus} {
    ${CATALOG_ENTRY}
  }
  ${fields.opportunityStatusRef}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.winningChance}
`
}

/**
 * Build Note fragment using fields mapping (REF fields only, no relations)
 */
export const buildNoteFragment = (fields: Record<keyof typeof NoteFields, string> = NoteFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.authorEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.authorEmployeeId}
  ${fields.id}
  ${fields.reminderDate}
  ${fields.source}
  # text missing in CRM
  # title missing in CRM
`
}

/**
 * Build Document fragment using fields mapping (REF fields only, no relations)
 */
export const buildDocumentFragment = (fields: Record<keyof typeof DocumentFields, string> = DocumentFields): string => {
  return `
  ${DOCUMENT_REF}
  
  # Source and verification fields
  ${fields.source}
  ${fields.verified}
  ${fields.verificationDate}
  ${fields.authenticated}
  ${fields.authenticationDate}
  ${fields.mandatory}
  ${fields.expirationDate}
`
}

/**
 * Default Common Fields fragments (no relations)
 */
export const COMMON_ACCOUNT_FIELDS_NEW = buildAccountFragment(AccountFields)
export const COMMON_CONTACT_FIELDS_NEW = buildContactFragment(ContactFields)
export const COMMON_ACTIVITY_FIELDS_NEW = buildActivityFragment(ActivityFields)
export const COMMON_TASK_FIELDS_NEW = buildTaskFragment(TaskFields)
export const COMMON_LEAD_FIELDS_NEW = buildLeadFragment(LeadFields)
export const COMMON_OPPORTUNITY_FIELDS_NEW = buildOpportunityFragment(OpportunityFields)
export const COMMON_NOTE_FIELDS_NEW = buildNoteFragment(NoteFields)
export const COMMON_DOCUMENT_FIELDS_NEW = buildDocumentFragment(DocumentFields)
