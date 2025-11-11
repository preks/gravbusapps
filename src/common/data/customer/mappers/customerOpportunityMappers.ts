// Customer Opportunity Mapper - Transform base type to enhanced type with computed fields

import { CustomerOpportunity, CustomerOpportunityStageCondition } from '../types'
import { toCustomerAccount } from './customerAccountMappers'
import { toCustomerContact } from './customerContactMappers'

/**
 * Transform CustomerOpportunity (GraphQL response) to CustomerOpportunity (enhanced with field mappings)
 *
 * Handles CRM-specific field name mappings:
 * - salesPipeline → opportunityPipeline
 * - salesPipelineStage → opportunityPipelineStage
 * - contacts → opportunityContacts
 * - crmDocument / crmNote → documents / notes
 */
export function toCustomerOpportunity(base: CustomerOpportunity): CustomerOpportunity {
  const account = base.account ? toCustomerAccount(base.account) : base.account
  const contacts = base.contacts ? base.contacts.map(c => toCustomerContact(c)) : base.contacts

  // Map CRM field names to Opportunity standard (IRM naming)
  const opportunityPipeline = (base as any).salesPipeline || (base as any).opportunityPipeline || (base as any).pipeline
  const opportunityPipelineRef = (base as any).salesPipelineRef || (base as any).opportunityPipelineRef
  const opportunityPipelineStage = (base as any).salesPipelineStage || (base as any).opportunityPipelineStage
  const opportunityPipelineStageRef = (base as any).salesPipelineStageRef || (base as any).opportunityPipelineStageRef

  // Map CRM plural/array field names
  const opportunityContacts = (base as any).contacts || (base as any).opportunityContacts
  const documents = (base as any).crmDocument || (base as any).documents
  const notes = (base as any).crmNote || (base as any).notes

  // Normalize status field
  const normalizedStatus =
    (base as any).opportunityStatus ||
    ((base as any).status ? { id: '', code: (base as any).status, value: (base as any).status } : undefined)

  return {
    ...base,
    // Map CRM fields to Opportunity standard
    account,
    contacts,
    opportunityPipeline,
    opportunityPipelineRef,
    opportunityPipelineStage,
    opportunityPipelineStageRef,
    opportunityContacts,
    documents,
    notes,
    // Ensure numeric fields are present for UI list
    estimatedAmount: base.estimatedAmount,
    winningChance: (base as any).winningChance ?? (base as any).probability ?? undefined,
    // Normalize fields so UI can consume consistent names
    opportunityStatus: normalizedStatus
  } as CustomerOpportunity
}

/**
 * Transform CustomerOpportunityStageCondition (GraphQL response) to enhanced type
 *
 * Handles CRM-specific field name mappings:
 * - salesPipelineStageCondition → opportunityPipelineStageCondition
 * - salesTask → task
 */
export function toCustomerOpportunityStageCondition(raw: any): CustomerOpportunityStageCondition {
  const opportunityPipelineStageCondition = raw.salesPipelineStageCondition || raw.opportunityPipelineStageCondition
  const opportunityPipelineStageConditionRef =
    raw.salesPipelineStageConditionRef || raw.opportunityPipelineStageConditionRef
  const task = raw.salesTask || raw.task
  const taskId = raw.salesTaskId || raw.taskId

  return {
    ...raw,
    opportunityPipelineStageCondition,
    opportunityPipelineStageConditionRef,
    task,
    taskId
  }
}
