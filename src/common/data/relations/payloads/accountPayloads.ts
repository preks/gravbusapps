/**
 * Base Account Payload Builder
 * Centralized payload generation for Account entities across CRM and IRM
 *
 * This file provides a general payload builder that works with:
 * - Account interface (or its extensions like CustomerAccount, InvestmentAccount)
 * - Field constants (AccountFields, CustomerAccountFields, InvestmentAccountFields)
 *
 * The builder uses field constants to handle module-specific naming differences:
 * - CRM: industryRef, numberOfEmployeesRef, annualRevenueRef
 * - IRM: industryClassRef, companySizeRef, accountAnnualRevenueBandRef
 *
 * Usage:
 * - CRM: Use buildCustomerAccountPayload() which calls this with CustomerAccountFields
 * - IRM: Use buildInvestmentAccountPayload() which calls this with InvestmentAccountFields
 */

import type { Account } from '@/common/data/relations/types/accountTypes'
import { AccountFields } from '@/common/data/relations/types/accountTypes'
import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * Helper function to convert value to string or undefined
 * Ensures empty values are not included in payload
 */
export const toStringOrUndefined = (value: any): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value)
}

/**
 * Build Account payload with module-specific field mapping
 *
 * This is the base builder used by both CRM and IRM modules.
 * It handles:
 * - Field name mapping via accountFields parameter
 * - Empty value exclusion
 * - Complex array fields (addresses, communicationChannels, documents)
 * - ID/version for updates
 *
 * @param account - Partial Account entity (or CustomerAccount/InvestmentAccount)
 * @param accountFields - Field name mapping (AccountFields, CustomerAccountFields, or InvestmentAccountFields)
 * @param options - Build options (isUpdate flag)
 * @returns Payload object ready for API submission (without wrapper)
 *
 * @example CRM Usage (via buildCustomerAccountPayload):
 * ```typescript
 * const payload = buildAccountPayload(
 *   customerAccount,
 *   CustomerAccountFields,
 *   { isUpdate: true }
 * )
 * // industryClassRef → mapped to "industryRef" (CRM)
 * ```
 *
 * @example IRM Usage (via buildInvestmentAccountPayload):
 * ```typescript
 * const payload = buildAccountPayload(
 *   investmentAccount,
 *   InvestmentAccountFields,
 *   { isUpdate: true }
 * )
 * // industryClassRef → mapped to "industryClassRef" (IRM)
 * ```
 */
export const buildAccountPayload = (
  account: Partial<Account>,
  accountFields: Record<string, string> = AccountFields,
  options: { isUpdate?: boolean } = {}
) => {
  const payload: any = {}

  // Basic information (shared fields)
  if (account.name !== undefined) {
    payload[accountFields.name] = toStringOrUndefined(account.name)
  }
  if (account.code !== undefined) {
    payload[accountFields.code] = toStringOrUndefined(account.code)
  }
  if (account.website !== undefined) {
    payload[accountFields.website] = toStringOrUndefined(account.website)
  }

  // Legal and organizational fields
  if (account.legalFormRef !== undefined) {
    payload[accountFields.legalFormRef] = toStringOrUndefined(account.legalFormRef)
  }

  // Industry/Classification - mapped via accountFields
  if (account.industryClassRef !== undefined) {
    payload[accountFields.industryClassRef] = toStringOrUndefined(account.industryClassRef)
  }

  // Company size - mapped via accountFields
  if (account.companySizeRef !== undefined) {
    payload[accountFields.companySizeRef] = toStringOrUndefined(account.companySizeRef)
  }

  // Annual revenue - mapped via accountFields
  if (account.accountAnnualRevenueBandRef !== undefined) {
    payload[accountFields.accountAnnualRevenueBandRef] = toStringOrUndefined(account.accountAnnualRevenueBandRef)
  }

  // Dates
  if (account.foundationDate !== undefined) {
    payload[accountFields.foundationDate] = toISOFormat(account.foundationDate)
  }
  if (account.liquidationDate !== undefined) {
    payload[accountFields.liquidationDate] = toISOFormat(account.liquidationDate)
  }

  // Ownership
  if (account.ownerEmployeeId !== undefined) {
    payload[accountFields.ownerEmployee] = toStringOrUndefined(account.ownerEmployeeId)
  }

  // Additional information
  if (account.timeZoneRef !== undefined) {
    payload[accountFields.timeZoneRef] = toStringOrUndefined(account.timeZoneRef)
  }
  if (account.notesSummary !== undefined) {
    payload[accountFields.notesSummary] = toStringOrUndefined(account.notesSummary)
  }

  // Picture fields (optional, rarely used)
  if (account.picture !== undefined) {
    payload[accountFields.picture] = toStringOrUndefined(account.picture)
  }
  if (account.pictureThumbnail !== undefined) {
    payload[accountFields.pictureThumbnail] = toStringOrUndefined(account.pictureThumbnail)
  }

  // Complex fields (arrays) - only include if not empty
  if (account.addresses !== undefined && account.addresses.length > 0) {
    payload[accountFields.addresses] = account.addresses
  }
  if (account.communicationChannels !== undefined && account.communicationChannels.length > 0) {
    payload[accountFields.communicationChannels] = account.communicationChannels
  }
  if (account.documents !== undefined && account.documents.length > 0) {
    payload[accountFields.documents] = account.documents
  }

  // Include id and version for updates
  if (options.isUpdate && account.id) {
    payload.id = account.id
    payload.version = account.version || 0
  }

  return payload
}
