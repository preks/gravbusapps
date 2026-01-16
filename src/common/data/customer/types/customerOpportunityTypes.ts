/**
 * Customer Opportunity Types
 */

import {
  type Opportunity,
  type OpportunityStageCondition,
  OpportunityFields,
  createOpportunityDescriptors,
  OpportunityStageConditionFields,
  createOpportunityStageConditionDescriptors,
  opportunityFormFields,
  buildOpportunityContactAssociations
} from '@/common/data/relations/types/opportunityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { CustomerAddress } from './customerAddressTypes'
import type { CustomerCommunicationChannel } from './customerCommunicationChannelTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerNote } from './customerNoteTypes'
import type { CustomerTask } from './customerTaskTypes'
import type { CustomerOpportunityContact } from './customerRelationTypes'
import type { CustomerOpportunityAccount } from './customerAccountAssociationTypes'
import { toCustomerAccount } from './customerAccountTypes'
import { toCustomerContact } from './customerContactTypes'

/**
 * Customer Opportunity Type
 * Extends Opportunity with CRM-specific fields
 */
export interface CustomerOpportunity extends Opportunity {
  // Customer-specific typed relationships
  addresses?: CustomerAddress[]
  communicationChannels?: CustomerCommunicationChannel[]
  documents?: CustomerDocument[]
  notes?: CustomerNote[]
  opportunityContacts?: CustomerOpportunityContact[]
  tasks?: any[] // CustomerTask

  // Opportunity-Account Junction Table (many-to-many)
  // GraphQL field name: opportunityAccounts
  opportunityAccounts?: CustomerOpportunityAccount[]

  // CRM-specific fields
  salesCampaign?: any // CRM-specific (SalesCampaign)
  salesCampaignId?: string // CRM-specific
}

/**
 * Customer Opportunity Stage Condition Type
 * Extends OpportunityStageCondition with CRM-specific typed relationships
 */
export interface CustomerOpportunityStageCondition extends OpportunityStageCondition {
  opportunity?: CustomerOpportunity
  task?: CustomerTask
}

/**
 * Customer Opportunity Query Field Mapping
 * Extends OpportunityFields with CRM-specific GraphQL field names
 */
export const CustomerOpportunityFields = {
  ...OpportunityFields,
  // Override CRM-specific field names
  leads: 'lead', // CRM uses singular "lead"
  opportunityContacts: 'contacts', // CRM uses "contacts" not "opportunityContacts"
  opportunityPipeline: 'salesPipeline',
  opportunityPipelineRef: 'salesPipelineRef',
  opportunityPipelineStage: 'salesPipelineStage',
  opportunityPipelineStageRef: 'salesPipelineStageRef',
  opportunityStageConditions: 'stageConditionStatuses',
  // Junction table relationship - GraphQL field name is 'opportunityAccounts'
  customerOpportunityAccounts: 'opportunityAccounts',
  // Remove single account fields (CRM uses junction table only)
  account: undefined,
  accountId: undefined
} as const

/**
 * Customer Opportunity Stage Condition Query Field Mapping
 * Extends OpportunityStageConditionFields with CRM-specific GraphQL field names
 */
export const CustomerOpportunityStageConditionFields = {
  ...OpportunityStageConditionFields,
  // Override CRM-specific field names
  opportunityPipelineStageCondition: 'salesPipelineStageCondition',
  opportunityPipelineStageConditionRef: 'salesPipelineStageConditionRef',
  task: 'salesTask',
  taskId: 'salesTaskId'
} as const

export type CustomerOpportunityStageConditionFieldName =
  (typeof CustomerOpportunityStageConditionFields)[keyof typeof CustomerOpportunityStageConditionFields]

/**
 * Customer Opportunity Descriptors
 * Uses createOpportunityDescriptors with CustomerOpportunityFields mapping
 * Filters out and overrides descriptors with structural differences (CRM uses different nested field names)
 * Adds CRM-specific fields that don't exist in Common/IRM
 */
export const CUSTOMER_OPPORTUNITY_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors that need structural overrides
  ...createOpportunityDescriptors(CustomerOpportunityFields as Record<keyof typeof OpportunityFields, string>).filter(
    d => !['leads', 'notes', 'opportunityContacts', 'opportunityStageConditions', 'rejectionReasons'].includes(d.key)
  ),
  {
    key: 'opportunityStageConditions',
    searchPaths: ['stageConditionStatuses.salesPipelineStageCondition.value'],
    sortPaths: ['stageConditionStatuses.salesPipelineStageCondition.value'],
    type: 'text'
  },
  // CRM-specific structural overrides
  {
    key: 'notes',
    searchPaths: ['notes.noteTitle', 'notes.noteText'], // CRM uses "noteTitle"/"noteText"
    sortPaths: ['notes.noteTitle', 'notes.noteText'],
    type: 'text'
  },

  {
    key: 'opportunityContacts',
    searchPaths: ['contacts.contact.firstName', 'contacts.contact.lastName'], // CRM uses "contacts" not "opportunityContacts"
    sortPaths: ['contacts.contact.firstName', 'contacts.contact.lastName'],
    type: 'text'
  },

  // CRM-specific additional fields
  { key: 'salesCampaignIds', path: 'salesCampaignId', kind: 'inIds' },
  { key: 'contactIds', path: 'contacts.contact.id', kind: 'inIds' }, // CRM uses "contacts" not "opportunityContacts"
  { key: 'accountIds', path: 'opportunityAccounts.accountId', kind: 'inIds' } // Junction table for many-to-many accounts
]

/**
 * Customer Opportunity Stage Condition Descriptors
 * Uses createOpportunityStageConditionDescriptors with CustomerOpportunityStageConditionFields mapping
 */
export const CUSTOMER_OPPORTUNITY_STAGE_CONDITION_DESCRIPTORS: Descriptor[] = [
  ...createOpportunityStageConditionDescriptors(
    CustomerOpportunityStageConditionFields as Record<keyof typeof OpportunityStageConditionFields, string>
  )
]

/**
 * Customer Opportunity Form Fields Configuration
 * Extends opportunityFormFields with CRM-specific field mappings
 */
export const customerOpportunityFormFields = {
  ...opportunityFormFields,
  // Override mappings for CRM field name differences
  opportunityPipelineRef: 'salesPipelineRef',
  opportunityPipelineStageRef: 'salesPipelineStageRef',
  // CRM-specific fields
  salesCampaignId: 'salesCampaign'
} as const

/**
 * Build Customer Opportunity payload for CRM module
 *
 * Automatically handles:
 * - Field name mapping via customerOpportunityFormFields
 * - Empty value exclusion
 * - ID/version automatically included if present (determines update vs create)
 * - CRM-specific fields (salesCampaign, tags, additionalProperties)
 * - Contact associations
 *
 * @param opportunity - Partial CustomerOpportunity entity (only fields provided by form)
 * @returns Payload object ready for API submission
 */
export const buildCustomerOpportunityPayload = (opportunity: Partial<CustomerOpportunity>) => {
  // Build base payload using customerOpportunityFormFields for field mapping
  // opportunityContacts is automatically processed by buildPayload (like accountContacts in AccountForm)
  const basePayload = buildPayload(opportunity, customerOpportunityFormFields)

  return {
    opportunity: basePayload
  }
}

/**
 * Build opportunity contacts array for CRM
 * Used in convert lead flow and form submissions
 *
 * @param contactIds - Array of contact IDs or contact objects with metadata
 * @param opportunityId - Opportunity ID (for associations)
 * @returns Array of opportunity contact association objects
 */
export const buildCustomerOpportunityContacts = (contactIds: string[] = [], opportunityId?: string): any[] => {
  return buildOpportunityContactAssociations(contactIds, opportunityId)
}

/**
 * Transform CustomerOpportunity (raw GraphQL) to CustomerOpportunity (enhanced/standardized)
 *
 * Handles CRM-specific field naming inconsistencies by mapping them to Opportunity standards.
 * Uses fallback pattern: only maps if target field doesn't already exist.
 *
 * Key Mappings (fallback only):
 * - salesPipeline → opportunityPipeline
 * - salesPipelineStage → opportunityPipelineStage
 * - contacts → opportunityContacts
 * - crmDocument / crmNote → documents / notes
 * - opportunityAccounts → mapped with nested account entities
 */
export function toCustomerOpportunity(raw: any): CustomerOpportunity {
  // Extract incorrectly named fields to exclude from spread
  const {
    salesPipeline,
    salesPipelineRef,
    salesPipelineStage,
    salesPipelineStageRef,
    stageConditionStatuses,
    crmDocument,
    crmNote,
    ...rest
  } = raw

  // Map opportunityAccounts: each item has a nested account field
  const mappedOpportunityAccounts = raw.opportunityAccounts
    ? raw.opportunityAccounts.map((oa: any) => ({
        ...oa,
        account: oa.account ? toCustomerAccount(oa.account) : oa.account
      }))
    : raw.opportunityAccounts

  // Map opportunityContacts: each item is an OpportunityContact with a nested contact field
  const mappedOpportunityContacts = raw.contacts
    ? raw.contacts.map((oc: any) => ({
        ...oc,
        contact: oc.contact ? toCustomerContact(oc.contact) : oc.contact
      }))
    : raw.opportunityContacts

  // Map opportunityStageConditions: each item needs salesPipelineStageCondition → opportunityPipelineStageCondition
  const mappedOpportunityStageConditions = raw.opportunityStageConditions
    ? raw.opportunityStageConditions.map((sc: any) => toCustomerOpportunityStageCondition(sc))
    : stageConditionStatuses
      ? stageConditionStatuses.map((sc: any) => toCustomerOpportunityStageCondition(sc))
      : raw.opportunityStageConditions

  return {
    ...rest,
    opportunityAccounts: mappedOpportunityAccounts,
    // Map only if target field doesn't already exist (fallback mapping)
    opportunityPipeline: raw.opportunityPipeline ?? salesPipeline,
    opportunityPipelineRef: raw.opportunityPipelineRef ?? salesPipelineRef,
    opportunityPipelineStage: raw.opportunityPipelineStage ?? salesPipelineStage,
    opportunityPipelineStageRef: raw.opportunityPipelineStageRef ?? salesPipelineStageRef,
    opportunityStageConditions: mappedOpportunityStageConditions,
    opportunityContacts: raw.opportunityContacts ?? mappedOpportunityContacts,
    documents: raw.documents ?? crmDocument,
    notes: raw.notes ?? crmNote
  } as CustomerOpportunity
}

/**
 * Transform CustomerOpportunityStageCondition (raw GraphQL) to CustomerOpportunityStageCondition (enhanced/standardized)
 *
 * Handles CRM-specific field naming inconsistencies by mapping them to Opportunity standards.
 * Uses fallback pattern: only maps if target field doesn't already exist.
 *
 * Key Mappings (fallback only):
 * - salesPipelineStageCondition → opportunityPipelineStageCondition
 * - salesTask → task
 */
export function toCustomerOpportunityStageCondition(raw: any): CustomerOpportunityStageCondition {
  // Extract incorrectly named fields to exclude from spread
  const { salesPipelineStageCondition, salesPipelineStageConditionRef, salesTask, salesTaskId, ...rest } = raw

  return {
    ...rest,
    // Map only if target field doesn't already exist (fallback mapping)
    opportunityPipelineStageCondition: raw.opportunityPipelineStageCondition ?? salesPipelineStageCondition,
    opportunityPipelineStageConditionRef: raw.opportunityPipelineStageConditionRef ?? salesPipelineStageConditionRef,
    task: raw.task ?? salesTask,
    taskId: raw.taskId ?? salesTaskId
  } as CustomerOpportunityStageCondition
}
