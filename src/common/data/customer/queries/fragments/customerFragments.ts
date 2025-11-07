/**
 * Customer Main Fragments
 *
 * Contains ALL complete fragments for Customer Relations (CRM) entities with entity relations.
 * These fragments extend their corresponding REF fragments and add entity relations.
 *
 * This file MUST be imported AFTER customerReferenceFragments.ts.
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import {
  CUSTOMER_ACCOUNT_REF,
  CUSTOMER_CONTACT_REF,
  CUSTOMER_LEAD_REF,
  CUSTOMER_OPPORTUNITY_REF,
  CUSTOMER_TASK_REF,
  CUSTOMER_TASK_TEMPLATE_REF,
  CUSTOMER_ACTIVITY_REF,
  CUSTOMER_DOCUMENT_REF,
  CUSTOMER_NOTE_REF,
  CUSTOMER_CAMPAIGN_REF,
  CUSTOMER_ADDRESS_REF
} from './customerReferenceFragments'

/**
 * ============================================================================
 * CUSTOMER_ACCOUNT
 * ============================================================================
 */
export const CUSTOMER_ACCOUNT = `
  ${CUSTOMER_ACCOUNT_REF}
  
  # Entity relations
  addresses(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ADDRESS_REF}
  }
  
  communicationChannels(where: { isDeleted: { _eq: false } }) {
    ${COMMUNICATION_CHANNEL_REF}
  }
  
  documents(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_DOCUMENT_REF}
  }
  
  notes(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_NOTE_REF}
  }
  
  tasks(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_TASK_REF}
  }
  
  # TODO: Map "accountContacts" array in mapper
  accountContacts(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    contactType
    contact {
      ${CUSTOMER_CONTACT_REF}
    }
  }
  
  # TODO: Map singular "contact" to plural "contacts" in mapper
  contact(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_CONTACT_REF}
  }
  
  # TODO: Map singular "opportunity" to plural "opportunities" in mapper
  opportunity(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_OPPORTUNITY_REF}
  }
  
  # CRM duplicate relations
  crmAddress(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ADDRESS_REF}
  }
  
  crmDocument(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_DOCUMENT_REF}
  }
  
  crmNote(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_NOTE_REF}
  }
  
  # CRM-specific fields
  salesCampaign {
    ${CUSTOMER_CAMPAIGN_REF}
  }
`

/**
 * ============================================================================
 * CUSTOMER_LEAD
 * ============================================================================
 * Customer Lead Fragment
 * Complete CRM Lead fragment with ALL CRM-specific fields and relations
 * Integrates CUSTOMER_LEAD_REF and adds all entity relations
 *
 * TODO MAPPER: The following fields need mapping to CommonLead:
 * - annualRevenue → accountAnnualRevenueBand (catalog)
 * - annualRevenueRef → accountAnnualRevenueBandRef
 * - account → will be converted to accounts array
 * - accountId → will be in accounts array
 */
export const CUSTOMER_LEAD = `
  ${CUSTOMER_LEAD_REF}
  activities(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ACTIVITY_REF}
  }
  convertedAccount {
    ${CUSTOMER_ACCOUNT_REF}
  }
  convertedAccountId
  convertedContact {
    ${CUSTOMER_CONTACT_REF}
  }
  convertedContactId
  convertedOpportunity {
    ${CUSTOMER_OPPORTUNITY_REF}
  }
  convertedOpportunityId
  documents(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_DOCUMENT_REF}
  }
  notes(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_NOTE_REF}
  }
  tasks(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_TASK_REF}
  }
`

/**
 * ============================================================================
 * CUSTOMER_CONTACT
 * ============================================================================
 * Customer Contact Fragment
 * Complete CRM Contact fragment with entity relations
 */
/**
 * ============================================================================
 * CUSTOMER_CONTACT
 * ============================================================================
 * Customer Contact Fragment
 * Extends CUSTOMER_CONTACT_REF and adds entity relations
 *
 * WRONG FIELD NAMES (will be mapped to Common naming in mapper):
 * - contactType → type
 * - jobTitle → jobPosition
 * - pictureUrl → picture
 * - pictureThumbnailUrl → pictureThumbnail
 * - lead (singular) → leads (plural)
 */
export const CUSTOMER_CONTACT = `
  ${CUSTOMER_CONTACT_REF}
  activities(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ACTIVITY_REF}
  }
  accountContacts(where: { isDeleted: { _eq: false } }) {
    ${AUDIT_FIELDS}
    id
    contactType
    account {
      ${CUSTOMER_ACCOUNT_REF}
    }
    accountId
  }
  addresses(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ADDRESS_REF}
  }
  
  communicationChannels(where: { isDeleted: { _eq: false } }) {
    ${COMMUNICATION_CHANNEL_REF}
  }
  
  documents(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_DOCUMENT_REF}
  }
  
  # TODO: Map singular "lead" to plural "leads" in mapper
  lead {
    ${CUSTOMER_LEAD_REF}
  }
  
  notes(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_NOTE_REF}
  }
  opportunityContacts(where: { isDeleted: { _eq: false } }) {
    ${AUDIT_FIELDS}
    id
    contactType
    opportunity
    opportunity {
      ${CUSTOMER_OPPORTUNITY_REF}
    }
  }
  tasks(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_TASK_REF}
  }
`

/**
 * ============================================================================
 * CUSTOMER_OPPORTUNITY
 * ============================================================================
 * Customer Opportunity Fragment
 * Extends CUSTOMER_OPPORTUNITY_REF with entity relations
 */
export const CUSTOMER_OPPORTUNITY = `
  ${CUSTOMER_OPPORTUNITY_REF}
  
  # Entity relations
  accountId
  account {
    ${CUSTOMER_ACCOUNT_REF}
  }
  activities(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ACTIVITY_REF}
  }
  addresses(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ADDRESS_REF}
  }
  
  communicationChannels(where: { isDeleted: { _eq: false } }) {
    ${COMMUNICATION_CHANNEL_REF}
  }
  
  documents(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_DOCUMENT_REF}
  }
  
  notes(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_NOTE_REF}
  }
  
  
  # TODO: Map "contacts" to "opportunityContacts" in mapper
  contacts(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    contactId
    contactType
    opportunityId
    contact {
      ${CUSTOMER_CONTACT_REF}
    }
  }
  
  # TODO: Map "stageConditionStatuses" to "opportunityStageConditions" in mapper
  stageConditionStatuses(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    completed
    completedAt
    completedByEmployee {
      ${EMPLOYEE_REF}
    }
    completedByEmployeeId
    configSnapshot
    deadlineAt
    opportunityId
    salesPipelineStageCondition {
      ${CATALOG_ENTRY}
    }
    salesPipelineStageConditionRef
    salesTask {
      ${CUSTOMER_TASK_REF}
    }
    salesTaskId
  
  }
  
  tasks(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_TASK_REF}
  }
  
  # CRM duplicate relations
  crmDocument(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_DOCUMENT_REF}
  }
  
  crmNote(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_NOTE_REF}
  }
  
  # CRM-specific fields
  salesCampaign {
    ${CUSTOMER_CAMPAIGN_REF}
  }
`

/**
 * ============================================================================
 * CUSTOMER_TASK_TEMPLATE
 * ============================================================================
 * TODO: salesTask -> tasks
 */
export const CUSTOMER_TASK_TEMPLATE = `
  ${CUSTOMER_TASK_TEMPLATE_REF}
  
  # TODO
  salesTask {
    ${CUSTOMER_TASK_REF}
  }
`

/**
 * ============================================================================
 * CUSTOMER_TASK
 * ============================================================================
 */
export const CUSTOMER_TASK = `
  ${CUSTOMER_TASK_REF}
  
  account { ${CUSTOMER_ACCOUNT_REF} }
  accountId
  contact { ${CUSTOMER_CONTACT_REF} }
  contactId
  lead { ${CUSTOMER_LEAD_REF} }
  leadId
  opportunity { ${CUSTOMER_OPPORTUNITY_REF} }
  opportunityId
  
  # Assigned employee
  assignedEmployee {
    ${EMPLOYEE_REF}
  }
  
  # Creator employee
  creatorEmployee {
    ${EMPLOYEE_REF}
  }
  salesTaskTemplate {
    ${CUSTOMER_TASK_TEMPLATE_REF}
  }
  salesTaskTemplateId
`

/**
 * ============================================================================
 * CUSTOMER_ACTIVITY
 * ============================================================================
 */
export const CUSTOMER_ACTIVITY = `
  ${CUSTOMER_ACTIVITY_REF}
  account { ${CUSTOMER_ACCOUNT_REF} }
  accountId
  contact { ${CUSTOMER_CONTACT_REF} }
  contactId
  documents(where: { isDeleted: { _eq: false } }) {
   ${CUSTOMER_DOCUMENT_REF}
  }
  lead { ${CUSTOMER_LEAD_REF} }
  leadId
  opportunity { ${CUSTOMER_OPPORTUNITY_REF} }
  opportunityId
`

/**
 * ============================================================================
 * CUSTOMER_DOCUMENT
 * ============================================================================
 * TODO: salesActivity/salesActivityId -> activity/activityId
 */
export const CUSTOMER_DOCUMENT = `
  ${CUSTOMER_DOCUMENT_REF}
  account { ${CUSTOMER_ACCOUNT_REF} }
  accountId
  contact { ${CUSTOMER_CONTACT_REF} }
  contactId
  opportunity { ${CUSTOMER_OPPORTUNITY_REF} }
  opportunityId
  lead { ${CUSTOMER_LEAD_REF} }
  leadId
  task (where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_TASK_REF} 
  }

  # TODO
  salesActivity { ${CUSTOMER_ACTIVITY_REF} }
  salesActivityId
`

/**
 * ============================================================================
 * CUSTOMER_NOTE
 * ============================================================================
 */
export const CUSTOMER_NOTE = `
  ${CUSTOMER_NOTE_REF}
  account { ${CUSTOMER_ACCOUNT_REF} }
  accountId
  contact { ${CUSTOMER_CONTACT_REF} }
  contactId
  documents(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_DOCUMENT_REF}
  }
  opportunity { ${CUSTOMER_OPPORTUNITY_REF} }
  opportunityId
  lead { ${CUSTOMER_LEAD_REF} }
  leadId
`
