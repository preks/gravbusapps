/**
 * Helper utilities for building investment update payloads in popup components
 * Reduces code duplication by centralizing payload building logic
 */

import { Investment } from '@/common/data/investment/types/investmentTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'
import { generateBusinessKey, getActiveSubtypeEntity } from './investmentPopupUtils'
import { getInvestmentUiSubtypeFromData } from '@/common/data/investment/utils/investmentGroupRouting'

/**
 * Creates an investment update payload for popup components that only update additionalProperties
 *
 * This function eliminates the need to manually copy all investment fields by:
 * - Spreading the entire raw investment from GraphQL
 * - Only overriding the additionalProperties field
 * - Letting buildInvestmentPayload handle all field conversions and subtype extraction
 *
 * @param params.investment - The full investment object from GraphQL
 * @param params.updatedAdditionalProperties - The new additionalProperties object to set
 * @param params.businessAppContext - The business app context with access token and user info
 * @param params.businessKeyPrefix - Prefix for the business key (e.g., 'investment-kpi-tile')
 * @param params.businessKeySuffix - Optional suffix for the business key (e.g., tile ID)
 * @returns The complete payload ready for AppActionForm submission
 *
 * @example
 * ```typescript
 * const payload = buildInvestmentPopupPayload({
 *   investment,
 *   updatedAdditionalProperties: { tilesData: updatedTiles },
 *   businessAppContext,
 *   businessKeyPrefix: 'investment-kpi-tile',
 *   businessKeySuffix: tileData.id
 * });
 * ```
 */
export const buildInvestmentPopupPayload = (params: {
  investment: Investment
  updatedAdditionalProperties: any
  businessAppContext: BusinessAppContextProps
  businessKeyPrefix: string
  businessKeySuffix?: string
}) => {
  const { investment, updatedAdditionalProperties, businessAppContext, businessKeyPrefix, businessKeySuffix } = params

  // Simple approach: spread the entire investment and only override additionalProperties
  // buildInvestmentPayload will handle:
  // - Extracting catalog IDs from full catalog objects
  // - Getting subtypes (equity/realEstate/liquidFund) from rawInvestmentData
  // - Converting field formats (dates, numbers, etc.)
  const investmentFormData: any = {
    investment: {
      ...investment,
      additionalProperties: updatedAdditionalProperties
    }
  }

  // Build the payload using the central builder
  const payload = buildInvestmentPayload(investmentFormData, businessAppContext, {
    isUpdate: true,
    rawInvestmentData: investment
  })

  // Add required metadata for Kogito workflow
  ;(payload as any).changeMode = 'UPDATE'
  ;(payload as any).businessKey = generateBusinessKey(businessKeyPrefix, businessKeySuffix)

  return payload
}

/**
 * Creates an investment update payload for popup components that update subtype additionalProperties
 * (e.g., equityInvestment.additionalProperties, not investment.additionalProperties)
 *
 * @param params.investment - The full investment object from GraphQL
 * @param params.updatedSubtypeAdditionalProperties - The new additionalProperties for the subtype
 * @param params.businessAppContext - The business app context with access token and user info
 * @param params.businessKeyPrefix - Prefix for the business key (e.g., 'investment-kpi')
 * @param params.businessKeySuffix - Optional suffix for the business key (e.g., kpi key)
 * @returns The complete payload ready for AppActionForm submission
 *
 * @example
 * ```typescript
 * const payload = buildInvestmentSubtypePayload({
 *   investment,
 *   updatedSubtypeAdditionalProperties: { kpis: updatedKpis },
 *   businessAppContext,
 *   businessKeyPrefix: 'investment-kpi',
 *   businessKeySuffix: kpiKey
 * });
 * ```
 */
export const buildInvestmentSubtypePayload = (params: {
  investment: Investment
  updatedSubtypeAdditionalProperties: any
  businessAppContext: BusinessAppContextProps
  businessKeyPrefix: string
  businessKeySuffix?: string
}) => {
  const { investment, updatedSubtypeAdditionalProperties, businessAppContext, businessKeyPrefix, businessKeySuffix } =
    params

  const investmentSubtype = getInvestmentUiSubtypeFromData(investment)

  // Spread the entire investment
  const investmentFormData: any = {
    investment: {
      ...investment
    }
  }

  // Update the appropriate subtype with new additionalProperties
  if (investmentSubtype === 'equity') {
    const existingEquity = getActiveSubtypeEntity(investment) || {}
    investmentFormData.equityInvestment = {
      ...existingEquity,
      additionalProperties: updatedSubtypeAdditionalProperties
    }
  } else if (investmentSubtype === 'real_estate') {
    const existingRealEstate = getActiveSubtypeEntity(investment) || {}
    investmentFormData.realEstateInvestment = {
      ...existingRealEstate,
      additionalProperties: updatedSubtypeAdditionalProperties
    }
  } else if (investmentSubtype === 'liquid_fund') {
    const existingLiquidFund = getActiveSubtypeEntity(investment) || {}
    investmentFormData.liquidFundInvestment = {
      ...existingLiquidFund,
      additionalProperties: updatedSubtypeAdditionalProperties
    }
  } else {
    // Generic groups (PRIVATE_EQUITY, TEST, etc.) have no dedicated table
    // additionalProperties go on main investment entity
    investmentFormData.investment.additionalProperties = {
      ...investment.additionalProperties,
      ...updatedSubtypeAdditionalProperties
    }
  }

  // Build the payload using the central builder
  const payload = buildInvestmentPayload(investmentFormData, businessAppContext, {
    isUpdate: true,
    rawInvestmentData: investment
  })

  // Add required metadata for Kogito workflow
  ;(payload as any).changeMode = 'UPDATE'
  ;(payload as any).businessKey = generateBusinessKey(businessKeyPrefix, businessKeySuffix)

  return payload
}
