/**
 * Base Opportunity Payload
 * Centralized payload generation for Opportunity entities across CRM and IRM
 *
 * This file provides:
 * - Field name mappings between CRM and IRM
 * - Base interface for opportunity form data
 * - Shared constants and utilities
 *
 * Usage:
 * - CRM: Use CustomerOpportunityPayload with buildCustomerOpportunityPayload()
 * - IRM: Use InvestmentOpportunityPayload with buildInvestmentOpportunityPayload()
 */

/**
 * Field name mapping between CRM and IRM modules
 *
 * Opportunities differ mainly in pipeline-related field names
 */
export const OpportunityFieldMapping = {
  // Shared fields (identical names in both modules)
  shared: {
    name: 'name',
    code: 'code',
    businessKey: 'businessKey',
    estimatedAmount: 'estimatedAmount',
    currencyRef: 'currencyRef',
    closeDate: 'closeDate',
    winningChance: 'winningChance',
    opportunityStatusRef: 'opportunityStatusRef',
    personal: 'personal',
    notesSummary: 'notesSummary',
    account: 'account',
    lead: 'lead',
    ownerEmployee: 'ownerEmployee',
    addresses: 'addresses',
    communicationChannels: 'communicationChannels',
    documents: 'documents',
    notes: 'notes',
    tasks: 'tasks',
    activities: 'activities'
  },

  // CRM-specific field names (Customer module)
  crm: {
    pipeline: 'salesPipelineRef', // CRM uses salesPipelineRef
    pipelineStage: 'salesPipelineStageRef' // CRM uses salesPipelineStageRef
  },

  // IRM-specific field names (Investment module)
  irm: {
    pipeline: 'opportunityPipelineRef', // IRM uses opportunityPipelineRef
    pipelineStage: 'opportunityPipelineStageRef' // IRM uses opportunityPipelineStageRef
  }
} as const

/**
 * Base interface for opportunity form data (semantic fields)
 *
 * This interface uses semantic field names that are module-agnostic.
 * Module-specific payload builders will map these to the correct field names.
 */
export interface BaseOpportunityFormData {
  // Identity fields
  id?: string
  version?: number
  code?: string
  businessKey?: string

  // Basic information
  name?: string // Shared field
  description?: string // Additional information
  notesSummary?: string // Shared field

  // Financial information
  estimatedAmount?: number | string // Shared field
  currency?: string // Maps to: currencyRef
  currencyRef?: string // Alternative to currency
  closeDate?: string // Shared field
  winningChance?: number | string // Shared field (percentage)

  // Pipeline information (semantic fields)
  pipeline?: string // Maps to: salesPipelineRef (CRM) or opportunityPipelineRef (IRM)
  pipelineStage?: string // Maps to: salesPipelineStageRef (CRM) or opportunityPipelineStageRef (IRM)
  salesPipelineStage?: string // Alternative to pipelineStage
  opportunityStatus?: string // Maps to: opportunityStatusRef
  stage?: string // Stage field (CRM)
  status?: string // Status field (CRM)
  lastInteraction?: string // Last interaction timestamp (CRM)

  // Type/classification
  personal?: boolean // Shared field

  // Relationships
  accountId?: string // Maps to: account
  account?: string // Alternative to accountId
  leadId?: string // Maps to: lead
  lead?: string // Alternative to leadId

  // Ownership
  owner?: string // Maps to: ownerEmployee
  ownerEmployeeId?: string // Alternative to owner

  // Complex fields (arrays/objects)
  addresses?: any[] // Shared field
  communicationChannels?: any[] // Shared field
  documents?: any[] // Shared field
  notes?: any[] // Shared field
  tasks?: any[] // Shared field
  activities?: any[] // Shared field

  // Contact associations
  contactIds?: string[] // Used for opportunity-contact associations
  opportunityContacts?: any[] // Full association objects

  // Additional metadata
  recordState?: string // Process state
  processInstanceId?: string // Process tracking
  express1?: any // Express field 1 (custom data)
  express2?: any // Express field 2 (custom data)

  // IRM-exclusive investment fields (used only in Investment module)
  forecastedProfitAmount?: number | string // IRM only - Forecasted profit amount
  initialInvestmentAmount?: number | string // IRM only - Initial investment amount
  stakePercentage?: number | string // IRM only - Stake percentage
  marketValue?: number | string // IRM only - Market value
  loanAmount?: number | string // IRM only - Loan amount
  loanInterestRate?: number | string // IRM only - Loan interest rate
  requiredCapitalAmount?: number | string // IRM only - Required capital amount
  annualNetColdRent?: number | string // IRM only - Annual net cold rent
  investmentGroupRef?: string // IRM only - Investment group reference
  investmentTypeRef?: string // IRM only - Investment type reference
  investmentRoleRef?: string // IRM only - Investment role reference
  investmentStakeTypeRef?: string // IRM only - Investment stake type reference
  buildingYear?: string | number // IRM only - Building year (real estate)
  size?: number | string // IRM only - Size (real estate)
  sizeMeasurementUnitRef?: string // IRM only - Size measurement unit
  measurementUnit?: string // IRM only - Alternative to sizeMeasurementUnitRef
}

/**
 * Type helper for field names
 */
export type OpportunityFieldName =
  | keyof typeof OpportunityFieldMapping.shared
  | keyof typeof OpportunityFieldMapping.crm
  | keyof typeof OpportunityFieldMapping.irm

/**
 * Helper function to convert value to string or undefined
 */
export const toStringOrUndefined = (value: any): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value)
}

/**
 * Helper function to convert value to number or undefined
 */
export const toNumberOrUndefined = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? undefined : num
}

/**
 * Helper function to build opportunity contact associations
 * Used for managing many-to-many relationships between opportunities and contacts
 */
export const buildOpportunityContactAssociations = (contactIds: string[] = [], opportunityId?: string): any[] => {
  return contactIds.map(contactId => {
    if (typeof contactId === 'object' && (contactId as any).id) {
      // Existing association with metadata
      const contact = contactId as any
      const association: any = {
        contactType: contact.contactType || null,
        opportunity: opportunityId,
        contact: contact.id
      }

      // Include association ID and version if it exists (for updates)
      if (contact.associationId) {
        association.id = contact.associationId
        if (contact.associationVersion !== undefined) {
          association.version = contact.associationVersion
        }
      }

      return association
    }

    // New association - simple format
    return {
      contactType: null,
      opportunity: opportunityId,
      contact: typeof contactId === 'string' ? contactId : (contactId as any).id
    }
  })
}
