/**
 * Investment Account Payloads (IRM)
 * Payload generation for Account entities in the Investment Relations Management module
 *
 * This module provides:
 * - buildInvestmentAccountPayload() function
 * - Uses InvestmentAccount interface and InvestmentAccountFields for mapping
 * - Handles IRM-specific fields (mission, geographicPresence, specialty, accountContacts)
 * - Handles IRM-specific field names (industryClassRef, companySizeRef, accountAnnualRevenueBandRef)
 *
 * Usage:
 * ```typescript
 * import { buildInvestmentAccountPayload } from '@/common/data/investment/payloads'
 *
 * const payload = buildInvestmentAccountPayload(investmentAccount, { isUpdate: true })
 * dispatchProcessContinueEvent('pse_submit', payload)
 * ```
 */

import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import { InvestmentAccountFields } from '@/common/data/investment/types/investmentAccountTypes'
import { buildAccountPayload, toStringOrUndefined } from '@/common/data/relations/payloads/accountPayloads'

/**
 * Build Investment Account payload for IRM module
 *
 * Automatically handles:
 * - Field name mapping via InvestmentAccountFields (industryClassRef, companySizeRef, etc.)
 * - Empty value exclusion
 * - ID/version for updates
 * - IRM-specific fields (mission, geographicPresence, specialty, parentAccount, accountContacts)
 *
 * @param account - Partial InvestmentAccount entity (only fields provided by form)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission
 *
 * @example
 * ```typescript
 * const payload = buildInvestmentAccountPayload({
 *   name: 'ACME Corp',
 *   industryClassRef: 'Industry:v1:TECH',
 *   ownerEmployeeId: 'employee-uuid',
 *   mission: 'Transform the world',
 *   geographicPresence: 'Global'
 * })
 * // Result: { investmentAccount: { name: 'ACME Corp', industryClassRef: '...', ownerEmployee: '...', mission: '...', ... } }
 * ```
 */
export const buildInvestmentAccountPayload = (
  account: Partial<InvestmentAccount> & Record<string, any>,
  options: { isUpdate?: boolean } = {}
) => {
  // Build base payload using InvestmentAccountFields for IRM-specific field mapping
  const basePayload = buildAccountPayload(account, InvestmentAccountFields as Record<string, string>, options)

  // Add IRM-specific contact information (email, phone, businessKey)
  if ((account as any).email !== undefined) {
    basePayload.email = toStringOrUndefined((account as any).email)
  }
  if ((account as any).phone !== undefined) {
    basePayload.phone = toStringOrUndefined((account as any).phone)
  }
  if ((account as any).businessKey !== undefined) {
    basePayload.businessKey = toStringOrUndefined((account as any).businessKey)
  }

  // Add IRM-exclusive specialty field
  if ((account as any).specialty !== undefined) {
    basePayload.specialty = toStringOrUndefined((account as any).specialty)
  }

  // Add IRM-exclusive mission field
  if ((account as any).mission !== undefined) {
    basePayload.mission = toStringOrUndefined((account as any).mission)
  }

  // Add IRM-exclusive geographicPresence field
  if ((account as any).geographicPresence !== undefined) {
    basePayload.geographicPresence = toStringOrUndefined((account as any).geographicPresence)
  }

  // Add IRM-exclusive parentAccount field
  if ((account as any).parentAccount !== undefined) {
    basePayload.parentAccount = toStringOrUndefined((account as any).parentAccount)
  }

  // Handle accountContacts (IRM-specific association)
  if (account.accountContacts !== undefined && account.accountContacts.length > 0) {
    basePayload[InvestmentAccountFields.accountContacts] = account.accountContacts
  } else if ((account as any).contactIds !== undefined && (account as any).contactIds.length > 0) {
    // Build accountContacts from contactIds
    basePayload[InvestmentAccountFields.accountContacts] = (account as any).contactIds.map((contactId: any) => {
      if (typeof contactId === 'object' && contactId.id) {
        // Existing association with metadata
        const association: any = {
          contactType: contactId.contactType || null,
          account: account.id,
          contact: contactId.id
        }

        // Include association ID and version if it exists (for updates)
        if (contactId.associationId) {
          association.id = contactId.associationId
          if (contactId.associationVersion !== undefined) {
            association.version = contactId.associationVersion
          }
        }

        return association
      }

      // New association - simple format
      return {
        contactType: null,
        account: account.id,
        contact: contactId
      }
    })
  }

  return {
    investmentAccount: basePayload
  }
}
