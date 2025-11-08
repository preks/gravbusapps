/**
 * Customer Opportunity Types
 */

import type {
  CommonOpportunity,
  CommonOpportunityStageCondition
} from '@/common/data/relations/types/commonOpportunityTypes'
import { COMMON_OPPORTUNITY_DESCRIPTORS } from '@/common/data/relations/types/commonOpportunityTypes'
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
 * Customer Opportunity Descriptors
 * Extends Common descriptors with CRM-specific path overrides for wrong field names
 */
export const CUSTOMER_OPPORTUNITY_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors we need to override for CRM wrong field names
  ...COMMON_OPPORTUNITY_DESCRIPTORS.filter(
    d =>
      ![
        'addresses',
        'leads',
        'notes',
        'opportunityContacts',
        'opportunityPipeline',
        'opportunityPipelineRef',
        'opportunityPipelineStage',
        'opportunityPipelineStageRef',
        'opportunityPipelineIds',
        'opportunityPipelineStageIds',
        'opportunityStageConditions',
        'rejectionReasons'
      ].includes(d.key)
  ),

  {
    key: 'addresses',
    searchPaths: ['addresses.city', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    sortPaths: ['addresses.city', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    type: 'text'
  },
  {
    key: 'leads',
    searchPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'],
    sortPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'],
    type: 'text'
  },
  {
    key: 'notes',
    searchPaths: ['notes.noteTitle', 'notes.noteText'],
    sortPaths: ['notes.noteTitle', 'notes.noteText'],
    type: 'text'
  },
  {
    key: 'opportunityContacts',
    searchPaths: ['contacts.contact.firstName', 'contacts.contact.lastName'],
    sortPaths: ['contacts.contact.firstName', 'contacts.contact.lastName'],
    type: 'text'
  },
  // CRM-specific path overrides (key remains IRM-correct name, but paths use CRM field names)
  {
    key: 'opportunityPipeline',
    searchPaths: ['salesPipeline.value', 'salesPipeline.code'],
    sortPath: 'salesPipeline.value',
    type: 'text'
  },
  {
    key: 'opportunityPipelineRef',
    searchPaths: ['salesPipelineRef'],
    sortPath: 'salesPipelineRef',
    type: 'text'
  },
  {
    key: 'opportunityPipelineStage',
    searchPaths: ['salesPipelineStage.value', 'salesPipelineStage.code'],
    sortPath: 'salesPipelineStage.value',
    type: 'text'
  },
  {
    key: 'opportunityStageConditions',
    searchPaths: ['stageConditionStatuses.salesPipelineStageCondition.value'],
    sortPaths: ['stageConditionStatuses.salesPipelineStageCondition.value'],
    type: 'text'
  },

  // CRM-specific filter path overrides
  { key: 'opportunityPipelineIds', path: 'salesPipelineRef', kind: 'inIds' },
  { key: 'opportunityPipelineStageIds', path: 'salesPipelineStageRef', kind: 'inIds' },

  // CRM-specific additional fields
  { key: 'salesCampaignIds', path: 'salesCampaignId', kind: 'inIds' }
]
