/**
 * Convert To Nested Structure Utility
 * Transforms flat imported data into nested investment + realEstateInvestment structure
 */

import { ConvertedEntity } from '@/common/components/common-relations/apps/data-import/types'
import { ConvertedRealEstateInvestment } from '../types/realEstateInvestmentImportTypes'

/**
 * Converts flat CSV-imported data with prefixed fields into nested structure
 * Example input:
 *   { "investment.name": "Property A", "realEstateInvestment.buildingYear": "2010" }
 * Example output:
 *   { investment: { name: "Property A" }, realEstateInvestment: { buildingYear: "2010" } }
 */
export function convertToNestedRealEstateInvestment(flatEntity: ConvertedEntity): ConvertedRealEstateInvestment {
  const investment: any = {}
  const realEstateInvestment: any = {}

  // Separate fields by prefix
  for (const [key, value] of Object.entries(flatEntity)) {
    if (key.startsWith('investment.')) {
      const fieldName = key.replace('investment.', '')
      investment[fieldName] = value
    } else if (key.startsWith('realEstateInvestment.')) {
      const fieldName = key.replace('realEstateInvestment.', '')

      // Handle JSON fields - parse if string
      if (fieldName === 'liquidityForecast' && typeof value === 'string' && value.trim().length > 0) {
        try {
          realEstateInvestment[fieldName] = JSON.parse(value)
        } catch {
          // If parsing fails, store as-is (might be a simple string or invalid JSON)
          realEstateInvestment[fieldName] = value
        }
      } else {
        realEstateInvestment[fieldName] = value
      }
    }
  }

  // Set default investment group to REAL_ESTATE if not provided
  if (!investment.investmentGroupRef) {
    investment.investmentGroupRef = 'InvestmentGroup:v1:REAL_ESTATE'
  }

  // Set default status to ACTIVE if not provided
  if (!investment.investmentStatusRef) {
    investment.investmentStatusRef = 'InvestmentStatus:v1:ACTIVE'
  }

  return {
    investment,
    realEstateInvestment
  }
}
