/**
 * Utility functions for investment popups
 * Reduces code duplication and provides reusable validation/parsing logic
 */

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Common error messages
 */
export const INVESTMENT_ERRORS = {
  MISSING_ID: () => getTranslationFromI18nKeyAndLabel('investment.error.missingId', 'Investment ID is required'),
  DATA_NOT_LOADED: () =>
    getTranslationFromI18nKeyAndLabel('investment.error.dataNotLoaded', 'Investment data not loaded'),
  INVALID_DATA: () => getTranslationFromI18nKeyAndLabel('investment.error.invalidData', 'Invalid investment data')
} as const

/**
 * Extract investment ID from multiple possible sources in additionalData
 * Returns an empty string if no ID is found
 */
export const extractInvestmentId = (additionalData: any): string => {
  return (
    additionalData?.investmentId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId ||
    additionalData?.mainInvestmentId ||
    additionalData?.entityId ||
    additionalData?.targetEntityId ||
    additionalData?.id ||
    ''
  )
}

/**
 * Parse additional properties from string or object format
 * Returns empty object if parsing fails
 */
export const parseAdditionalProperties = (additionalProps: any): Record<string, any> => {
  if (!additionalProps) {
    return {}
  }

  if (typeof additionalProps === 'string') {
    try {
      return JSON.parse(additionalProps)
    } catch (error) {
      console.error('Failed to parse additionalProperties:', error)
      return {}
    }
  }

  return additionalProps
}

/**
 * Validate investment data exists
 * @throws Error if investment is not provided
 */
export const validateInvestmentData = (investment: any): void => {
  if (!investment) {
    throw new Error(INVESTMENT_ERRORS.DATA_NOT_LOADED())
  }
}

/**
 * Validate investment ID exists
 * Returns error message if invalid, null if valid
 */
export const validateInvestmentId = (investmentId: string | undefined): string | null => {
  if (!investmentId) {
    return INVESTMENT_ERRORS.MISSING_ID()
  }
  return null
}

/**
 * Generate a unique business key for Kogito workflows
 */
export const generateBusinessKey = (prefix: string, suffix?: string): string => {
  const timestamp = Date.now()
  return suffix ? `${prefix}-${suffix}-${timestamp}` : `${prefix}-${timestamp}`
}

/**
 * Get investment group type from investment group reference
 */
export const getInvestmentGroupType = (investment: any): string => {
  const groupRef = investment.investmentGroup?.id || ''
  return groupRef.split(':').pop() || ''
}
