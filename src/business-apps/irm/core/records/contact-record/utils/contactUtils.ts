// Contact utility functions for investment contact records
import { getContactTypeLabel } from '@/common/data/investment/types/investmentEnums'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Get human-readable contact type display value from junction (accountContacts)
 * @param contactData - Enhanced contact data from GraphQL
 * @param contact - Optional local contact data for fallback
 * @returns Human-readable contact type string
 */
export const getContactTypeDisplayValue = (contactData: any, contact?: any): string => {
  const contactType = contactData?.accountContacts?.[0]?.contactType ?? contact?.accountContacts?.[0]?.contactType
  return getContactTypeLabel(contactType)
}

/**
 * Get human-readable language display value
 * @param contactData - Enhanced contact data from GraphQL
 * @param contact - Local contact data
 * @returns Human-readable language string
 */
export const getLanguageDisplayValue = (contactData: any, contact: any): string => {
  // Try to get language from contactData (raw GraphQL), then transformed contact
  return (
    contactData?.language?.value ||
    contact?.language?.value ||
    getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')
  )
}

/**
 * Get full contact name with proper fallbacks
 * @param contactData - Enhanced contact data from GraphQL
 * @param contact - Local contact data (deprecated, kept for backward compatibility)
 * @returns Full contact name string
 */
export const getContactFullName = (contactData: any, contact?: any): string => {
  const firstName = contactData?.firstName || contact?.firstName || ''
  const lastName = contactData?.lastName || contact?.lastName || ''
  const fullName = `${firstName} ${lastName}`.trim()

  return fullName || getTranslationFromI18nKeyAndLabel('crm.common.unknownContact', 'Unknown Contact')
}
