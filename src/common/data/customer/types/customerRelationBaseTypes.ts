/**
 * Customer Relation Base Types - Backward Compatibility
 * Re-exports types with Base* naming for backward compatibility
 */

// Re-export all entity types with Base* prefix
export type { CustomerOpportunity as BaseCustomerOpportunity } from './customerOpportunityTypes'
export type { CustomerAddress as BaseCustomerAddress } from './customerAddressTypes'
export type { CustomerCommunicationChannel as BaseCustomerCommunicationChannel } from './customerCommunicationChannelTypes'
export type { CustomerAccountContact as BaseCustomerAccountContact } from './customerAccountContactTypes'
export type { CustomerDocument as BaseCustomerDocument } from './customerDocumentTypes'
export type { CustomerNote as BaseCustomerNote } from './customerNoteTypes'
export type { CustomerActivity as BaseCustomerActivity } from './customerActivityTypes'
export type { CustomerLead as BaseCustomerLead } from './customerLeadTypes'

// Re-export Ref types
export type { CustomerOpportunity as CustomerOpportunityRef } from './customerOpportunityTypes'
export type { CustomerLead as CustomerLeadRef } from './customerLeadTypes'
export type { CustomerDocument as CustomerDocumentRef } from './customerDocumentTypes'

// Re-export opportunity-related types if they exist
// export type { CustomerOpportunityContact as BaseCustomerOpportunityContact } from './customerOpportunityTypes'
