// Investment Opportunity Mappers - Transform base type to enhanced type with computed fields

import { InvestmentOpportunity, InvestmentOpportunityStageCondition } from '../types'

/**
 * Transform InvestmentOpportunity (GraphQL response) to InvestmentOpportunity (enhanced with field mappings)
 *
 * Handles IRM-prefixed field name mappings:
 * - investment → investments
 * - investmentActivity → activities
 * - investmentAddress → addresses
 * - investmentCommunicationChannel → communicationChannels
 * - investmentDocument → documents
 * - investmentLead → leads
 * - investmentNote → notes
 * - investmentOpportunityContact → opportunityContacts
 * - investmentOpportunityStageCondition → opportunityStageConditions
 * - investmentTask → tasks
 */
export function toInvestmentOpportunity(base: InvestmentOpportunity): InvestmentOpportunity {
  // Map IRM-prefixed array field names to common naming
  const investments = (base as any).investment
  const activities = (base as any).investmentActivity
  const addresses = (base as any).investmentAddress
  const communicationChannels = (base as any).investmentCommunicationChannel
  const documents = (base as any).investmentDocument
  const leads = (base as any).investmentLead
  const notes = (base as any).investmentNote
  const opportunityContacts = (base as any).investmentOpportunityContact
  const opportunityStageConditions = (base as any).investmentOpportunityStageCondition
  const tasks = (base as any).investmentTask

  return {
    ...base,
    // Map IRM-prefixed fields to common naming
    investments,
    activities,
    addresses,
    communicationChannels,
    documents,
    leads,
    notes,
    opportunityContacts,
    opportunityStageConditions,
    tasks
  } as InvestmentOpportunity
}

/**
 * Transform InvestmentOpportunityStageCondition (GraphQL response) to enhanced type
 *
 * NOTE: IRM field naming already matches OpportunityStageCondition standards.
 * No field mappings needed.
 */
export function toInvestmentOpportunityStageCondition(raw: any): InvestmentOpportunityStageCondition {
  // IRM uses correct field names, no mapping needed
  return {
    ...raw
  } as InvestmentOpportunityStageCondition
}
