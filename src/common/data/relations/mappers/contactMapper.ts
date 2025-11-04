/**
 * Contact Mapper
 * Maps context-specific Contact implementations to CommonContact structure
 */

import type { CommonContact } from '../types/commonContactTypes'
import type { BaseCustomerContact } from '@/common/data/customer/types/customerRelationBaseTypes'
import type { BaseInvestmentContact } from '@/common/data/investment/types/investmentRelationBaseTypes'

/**
 * Map Customer Contact to Common Contact structure
 * Handles field name differences and data transformations
 */
export function mapCustomerContactToCommon(customer: BaseCustomerContact): CommonContact {
  return {
    ...customer

    // All fields already match CommonContact structure
    // email, phone are deprecated but still exist in Base for GraphQL compatibility
  }
}

/**
 * Map Investment Contact to Common Contact structure
 * Handles field name differences and data transformations
 */
export function mapInvestmentContactToCommon(investment: BaseInvestmentContact): CommonContact {
  return {
    ...investment,

    // Map Investment-specific field name to CommonContact field name
    // Investment has: investmentAccountContact
    // CommonContact expects: accountContacts
    accountContacts: investment.investmentAccountContact

    // All other fields already match CommonContact structure
    // email, phone are deprecated but still exist in Base for GraphQL compatibility
  }
}

/**
 * Generic mapper that handles both Customer and Investment Contacts
 * Detects type based on available fields
 */
export function mapContactToCommon(contact: BaseCustomerContact | BaseInvestmentContact): CommonContact {
  // Both have same structure for now, so just return as CommonContact
  // Future: add specific detection if needed
  return contact as CommonContact
}
