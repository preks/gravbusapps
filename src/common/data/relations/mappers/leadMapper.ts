/**
 * Lead Mappers
 * Transform context-specific lead types to CommonLead interface
 */

import type { CommonLead } from '../types/commonLeadTypes'
import type { BaseCustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import type { BaseInvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'

/**
 * Map Customer Lead to Common Lead
 * Handles field name differences (email -> communicationChannels, leadRating -> rating, etc.)
 */
export function mapCustomerLeadToCommon(customer: BaseCustomerLead): CommonLead {
  return {
    ...customer,
    // Map CRM-specific field names to CommonLead
    jobPosition: customer.position || customer.jobPosition,
    rating: customer.leadRating || customer.rating,
    status: customer.leadStatus || customer.status,
    source: customer.leadSource || customer.source,
    industry: customer.industryClass || customer.industry
  }
}

/**
 * Map Investment Lead to Common Lead
 * Handles field name differences (phone -> communicationChannels, leadRating -> rating, etc.)
 */
export function mapInvestmentLeadToCommon(investment: BaseInvestmentLead): CommonLead {
  return {
    ...investment,
    // Map IRM-specific field names to CommonLead
    jobPosition: investment.position || investment.jobPosition,
    rating: investment.leadRating || investment.rating,
    status: investment.leadStatus || investment.status,
    source: investment.leadSource || investment.source,
    industry: investment.industryClass || investment.industry
  }
}

/**
 * Generic mapper (auto-detects type)
 */
export function mapLeadToCommon(lead: BaseCustomerLead | BaseInvestmentLead): CommonLead {
  return lead as CommonLead
}

/**
 * Get lead display name
 */
export function getLeadName(lead: CommonLead): string {
  if (lead.fullName) return lead.fullName

  const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
  if (name) return name

  if (lead.companyName) return lead.companyName

  return '-'
}
