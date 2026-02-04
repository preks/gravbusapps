/**
 * Convert To Nested Structure Utility
 * Transforms flat imported data into nested investment + liquidFundInvestment structure
 * with special handling for additionalProperties nesting
 */

import { ConvertedEntity } from '@/common/components/common-relations/apps/data-import/types'
import { ConvertedLiquidFundInvestment } from '../types/liquidFundInvestmentImportTypes'

/**
 * Converts flat CSV-imported data with prefixed fields into nested structure
 * Handles 3-level nesting: investment → liquidFundInvestment → additionalProperties
 *
 * Example input:
 *   {
 *     "investment.name": "Fund A",
 *     "liquidFundInvestment.bankName": "Example Bank",
 *     "liquidFundInvestment.additionalProperties.isin": "US1234567890"
 *   }
 *
 * Example output:
 *   {
 *     investment: { name: "Fund A" },
 *     liquidFundInvestment: {
 *       bankName: "Example Bank",
 *       additionalProperties: { isin: "US1234567890" }
 *     }
 *   }
 */
export function convertToNestedLiquidFundInvestment(flatEntity: ConvertedEntity): ConvertedLiquidFundInvestment {
  const investment: any = {}
  const liquidFundInvestment: any = {}
  const additionalProperties: any = {}

  // Separate fields by prefix (order matters: check additionalProperties before base liquidFundInvestment)
  for (const [key, value] of Object.entries(flatEntity)) {
    if (key.startsWith('investment.')) {
      const fieldName = key.replace('investment.', '')
      investment[fieldName] = value
    } else if (key.startsWith('liquidFundInvestment.additionalProperties.')) {
      // Additional properties fields - extract and nest in additionalProperties object
      const fieldName = key.replace('liquidFundInvestment.additionalProperties.', '')
      additionalProperties[fieldName] = value
    } else if (key.startsWith('liquidFundInvestment.')) {
      // Base liquid fund fields
      const fieldName = key.replace('liquidFundInvestment.', '')
      liquidFundInvestment[fieldName] = value
    }
  }

  // Add additionalProperties object to liquidFundInvestment if any fields were collected
  if (Object.keys(additionalProperties).length > 0) {
    liquidFundInvestment.additionalProperties = additionalProperties
  }

  // Set default investment group to LIQUID_FUND if not provided
  if (!investment.investmentGroupRef) {
    investment.investmentGroupRef = 'InvestmentGroup:v1:LIQUID_FUND'
  }

  // Set default status to ACTIVE if not provided
  if (!investment.investmentStatusRef) {
    investment.investmentStatusRef = 'InvestmentStatus:v1:ACTIVE'
  }

  return {
    investment,
    liquidFundInvestment
  }
}
