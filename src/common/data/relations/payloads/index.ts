/**
 * Relations Payloads - Base Payload Exports
 *
 * This module exports base payload structures and utilities for all relation entities:
 * - Account
 * - Lead
 * - Contact
 * - Opportunity
 *
 * These base payloads provide:
 * - Field name mappings between CRM and IRM
 * - Base interfaces for form data
 * - Shared utilities and helpers
 *
 * Module-specific implementations (CRM and IRM) extend these base structures
 * and provide concrete payload generation functions.
 *
 * Usage:
 * ```typescript
 * // For field mappings and interfaces
 * import { AccountFieldMapping, BaseAccountFormData } from '@/common/data/relations/payloads'
 *
 * // For module-specific payload builders
 * import { buildCustomerAccountPayload } from '@/common/data/customer/payloads'
 * import { buildInvestmentAccountPayload } from '@/common/data/investment/payloads'
 * ```
 */

// Account payloads
export {
  AccountFieldMapping,
  BaseAccountFormData,
  AccountFieldName,
  toStringOrUndefined as accountToStringOrUndefined,
  toISODateFormat as accountToISODateFormat
} from './accountPayloads'

// Lead payloads
export {
  LeadFieldMapping,
  BaseLeadFormData,
  LeadFieldName,
  toStringOrUndefined as leadToStringOrUndefined
} from './leadPayloads'

// Contact payloads
export {
  ContactFieldMapping,
  BaseContactFormData,
  ContactFieldName,
  toStringOrUndefined as contactToStringOrUndefined,
  generateFullName
} from './contactPayloads'

// Opportunity payloads
export {
  OpportunityFieldMapping,
  BaseOpportunityFormData,
  OpportunityFieldName,
  toStringOrUndefined as opportunityToStringOrUndefined,
  toNumberOrUndefined,
  buildOpportunityContactAssociations
} from './opportunityPayloads'

/**
 * Field Mapping Summary
 *
 * Key differences between CRM and IRM field names:
 *
 * Account & Lead:
 * - industry: industryRef (CRM) vs industryClassRef (IRM)
 * - companySize: numberOfEmployeesRef (CRM) vs companySizeRef (IRM)
 * - annualRevenue: annualRevenueRef (CRM) vs accountAnnualRevenueBandRef (IRM)
 *
 * Opportunity:
 * - pipeline: salesPipelineRef (CRM) vs opportunityPipelineRef (IRM)
 * - pipelineStage: salesPipelineStageRef (CRM) vs opportunityPipelineStageRef (IRM)
 *
 * Contact:
 * - No field name differences (only module-exclusive fields differ)
 *
 * Module-Exclusive Fields:
 *
 * CRM (Customer Module):
 * - salesCampaign (all entities)
 * - additionalProperties (all entities)
 * - tags (all entities)
 *
 * IRM (Investment Module):
 * - dealType (Opportunity)
 * - investmentName (Opportunity)
 * - mission (Account)
 * - geographicPresence (Account)
 * - sensitive (Lead, Contact)
 */
