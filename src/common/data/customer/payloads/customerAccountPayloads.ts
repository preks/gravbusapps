/**
 * Customer Account Payloads (CRM)
 * Payload generation for Account entities in the Customer Relations Management module
 *
 * This module provides:
 * - buildCustomerAccountPayload() function
 * - Uses CustomerAccount interface and CustomerAccountFields for mapping
 * - Handles CRM-specific fields (salesCampaign, additionalProperties, tags)
 * - Handles CRM-specific field names (industryRef vs industryClassRef, etc.)
 *
 * Usage:
 * ```typescript
 * import { buildCustomerAccountPayload } from '@/common/data/customer/payloads'
 *
 * const payload = buildCustomerAccountPayload(customerAccount, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { CustomerAccountFields } from '@/common/data/customer/types/customerAccountTypes'
import { buildAccountPayload, toStringOrUndefined } from '@/common/data/relations/payloads/accountPayloads'

/**
 * Build Customer Account payload for CRM module
 *
 * Automatically handles:
 * - Field name mapping (industryClassRef → industryRef, etc.) via CustomerAccountFields
 * - Empty value exclusion
 * - ID/version for updates
 * - CRM-specific fields (salesCampaign, tags, additionalProperties, email, phone, businessKey)
 *
 * @param account - Partial CustomerAccount entity (only fields provided by form)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 *
 * @example
 * ```typescript
 * const payload = buildCustomerAccountPayload({
 *   name: 'ACME Corp',
 *   industryClassRef: 'Industry:v1:TECH', // Mapped to industryRef
 *   ownerEmployeeId: 'employee-uuid',
 *   salesCampaignId: 'campaign-uuid'
 * })
 * // Result: { customerAccount: { name: 'ACME Corp', industryRef: '...', ownerEmployee: '...', salesCampaign: '...' } }
 * ```
 */
export const buildCustomerAccountPayload = (
  account: Partial<CustomerAccount> & Record<string, any>,
  options: { isUpdate?: boolean } = {}
) => {
  // Build base payload using CustomerAccountFields for CRM-specific field mapping
  const basePayload = buildAccountPayload(account, CustomerAccountFields as Record<string, string>, options)

  // Add CRM-specific contact information (email, phone, businessKey)
  if ((account as any).email !== undefined) {
    basePayload.email = toStringOrUndefined((account as any).email)
  }
  if ((account as any).phone !== undefined) {
    basePayload.phone = toStringOrUndefined((account as any).phone)
  }
  if ((account as any).businessKey !== undefined) {
    basePayload.businessKey = toStringOrUndefined((account as any).businessKey)
  }

  // Add CRM-exclusive fields
  if (account.salesCampaignId !== undefined) {
    basePayload.salesCampaign = toStringOrUndefined(account.salesCampaignId)
  }

  // Add CRM-exclusive additional properties
  if (
    (account as any).additionalProperties !== undefined &&
    Object.keys((account as any).additionalProperties).length > 0
  ) {
    basePayload.additionalProperties = (account as any).additionalProperties
  }

  // Add CRM-exclusive tags
  if ((account as any).tags !== undefined && (account as any).tags.length > 0) {
    basePayload.tags = (account as any).tags
  }

  return {
    customerAccount: basePayload
  }
}
