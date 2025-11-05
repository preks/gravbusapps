/**
 * Investment Relation Base Types - Backward Compatibility
 * Re-exports types with Base* naming for backward compatibility
 */

// Re-export all entity types with Base* prefix
export type { InvestmentOpportunity as BaseInvestmentOpportunity } from './investmentOpportunityTypes'
export type { InvestmentAddress as BaseInvestmentAddress } from './investmentAddressTypes'
export type { InvestmentCommunicationChannel as BaseInvestmentCommunicationChannel } from './investmentCommunicationChannelTypes'
export type { InvestmentAccountContact as BaseInvestmentAccountContact } from './investmentAccountContactTypes'
export type { InvestmentDocument as BaseInvestmentDocument } from './investmentDocumentTypes'
export type { InvestmentNote as BaseInvestmentNote } from './investmentNoteTypes'
export type { InvestmentActivity as BaseInvestmentActivity } from './investmentActivityTypes'
export type { InvestmentLead as BaseInvestmentLead } from './investmentLeadTypes'

// Re-export Ref types
export type { InvestmentOpportunity as InvestmentOpportunityRef } from './investmentOpportunityTypes'
export type { InvestmentLead as InvestmentLeadRef } from './investmentLeadTypes'
export type { InvestmentDocument as InvestmentDocumentRef } from './investmentDocumentTypes'

// Re-export Investment types
export type { Investment as InvestmentRef } from './investmentTypes'

// Re-export InvestmentRole if it exists
// export type { InvestmentRole as InvestmentRoleRef } from './investmentTypes'

// Re-export opportunity-related types if they exist
// export type { InvestmentOpportunityStageCondition as BaseInvestmentOpportunityStageCondition } from './investmentOpportunityTypes'
// export type { InvestmentOpportunityContact as BaseInvestmentOpportunityContact } from './investmentOpportunityTypes'
