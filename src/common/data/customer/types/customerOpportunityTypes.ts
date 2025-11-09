/**
 * Customer Opportunity Types
 */

import type {
  CommonOpportunity,
  CommonOpportunityStageCondition
} from '@/common/data/relations/types/commonOpportunityTypes'
import {
  OpportunityFields,
  createCommonOpportunityDescriptors
} from '@/common/data/relations/types/commonOpportunityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerAddress } from './customerAddressTypes'
import type { CustomerCommunicationChannel } from './customerCommunicationChannelTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerNote } from './customerNoteTypes'
import type { CustomerTask } from './customerTaskTypes'
import type { CustomerOpportunityContact } from './customerRelationTypes'

/**
 * Customer Opportunity Type
 * Extends CommonOpportunity with CRM-specific fields and proper type mappings
 */
export interface CustomerOpportunity extends CommonOpportunity {
  // Map any types from CommonOpportunity to specific Customer types
  account?: CustomerAccount
  addresses?: CustomerAddress[]
  communicationChannels?: CustomerCommunicationChannel[]
  documents?: CustomerDocument[]
  notes?: CustomerNote[]
  opportunityContacts?: CustomerOpportunityContact[]
  tasks?: any[] // CustomerTask

  // Base fields for mapping (CRM-specific GraphQL field names that need mapping)
  contacts?: CustomerOpportunityContact[] // Mapped to opportunityContacts
  crmDocument?: CustomerDocument[] // Duplicate - mapped to documents
  crmNote?: CustomerNote[] // Duplicate - mapped to notes
  salesCampaign?: any // CRM-specific (SalesCampaign)
  salesCampaignId?: string // CRM-specific
  salesPipeline?: any // Mapped to opportunityPipeline (CatalogEntry)
  salesPipelineRef?: string // Mapped to opportunityPipelineRef
  salesPipelineStage?: any // Mapped to opportunityPipelineStage (CatalogEntry)
  salesPipelineStageRef?: string // Mapped to opportunityPipelineStageRef
  stageConditionStatuses?: CustomerOpportunityStageCondition[] // Mapped to opportunityStageConditions
  tags?: any[] // CRM-specific (deprecated)
}

/**
 * Customer Opportunity Stage Condition Type
 * Extends CommonOpportunityStageCondition with CRM-specific fields and proper type mappings
 */
export interface CustomerOpportunityStageCondition extends CommonOpportunityStageCondition {
  // Map any types from CommonOpportunityStageCondition
  opportunity?: CustomerOpportunity
  task?: CustomerTask

  // Base fields for mapping (CRM-specific GraphQL field names)
  salesPipelineStageCondition?: any // Mapped to opportunityPipelineStageCondition (CatalogEntry)
  salesPipelineStageConditionRef?: string // Mapped to opportunityPipelineStageConditionRef
  salesTask?: CustomerTask // Mapped to task
  salesTaskId?: string // Mapped to taskId
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
  opportunityStageConditions: 'stageConditionStatuses'
} as const

export type CustomerOpportunityFieldName = (typeof CustomerOpportunityFields)[keyof typeof CustomerOpportunityFields]

/**
 * Customer Opportunity Descriptors
 * Uses createCommonOpportunityDescriptors with CustomerOpportunityFields mapping
 * Filters out and overrides descriptors with structural differences (CRM uses different nested field names)
 * Adds CRM-specific fields that don't exist in Common/IRM
 */
export const CUSTOMER_OPPORTUNITY_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors that need structural overrides
  ...createCommonOpportunityDescriptors(
    CustomerOpportunityFields as Record<keyof typeof OpportunityFields, string>
  ).filter(d => !['addresses', 'leads', 'notes', 'opportunityContacts'].includes(d.key)),

  // CRM-specific structural overrides
  {
    key: 'addresses',
    searchPaths: [
      'addresses.city', // CRM uses "city" not "locality"
      'addresses.postalCode',
      'addresses.region.value',
      'addresses.country.value'
    ],
    sortPaths: ['addresses.city', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    type: 'text'
  },
  {
    key: 'notes',
    searchPaths: ['notes.noteTitle', 'notes.noteText'], // CRM uses "noteTitle"/"noteText"
    sortPaths: ['notes.noteTitle', 'notes.noteText'],
    type: 'text'
  },
  {
    key: 'leads',
    searchPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'], // CRM uses singular "lead"
    sortPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'],
    type: 'text'
  },
  {
    key: 'opportunityContacts',
    searchPaths: ['contacts.contact.firstName', 'contacts.contact.lastName'], // CRM uses "contacts" not "opportunityContacts"
    sortPaths: ['contacts.contact.firstName', 'contacts.contact.lastName'],
    type: 'text'
  },

  // CRM-specific additional fields
  { key: 'salesCampaignIds', path: 'salesCampaignId', kind: 'inIds' }
]
