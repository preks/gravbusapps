/**
 * Convert To Nested Structure Utility
 * Transforms flat imported data into nested investment + equityInvestment structure
 */

import { ConvertedEntity } from '@/common/components/common-relations/apps/data-import/types'
import { ConvertedEquityInvestment } from '../types/equityInvestmentImportTypes'

/**
 * Converts flat CSV-imported data with prefixed fields into nested structure
 * Example input:
 *   { "investment.name": "Company A", "equityInvestment.foundationDate": "2010-01-15" }
 * Example output:
 *   { investment: { name: "Company A" }, equityInvestment: { foundationDate: "2010-01-15" } }
 */
export function convertToNestedEquityInvestment(flatEntity: ConvertedEntity): ConvertedEquityInvestment {
  const investment: any = {}
  const equityInvestment: any = {}

  // Separate fields by prefix
  for (const [key, value] of Object.entries(flatEntity)) {
    if (key.startsWith('investment.')) {
      const fieldName = key.replace('investment.', '')
      investment[fieldName] = value
    } else if (key.startsWith('equityInvestment.')) {
      const fieldName = key.replace('equityInvestment.', '')
      equityInvestment[fieldName] = value
    }
  }

  // Set default investment group to EQUITY if not provided
  if (!investment.investmentGroupRef) {
    investment.investmentGroupRef = 'InvestmentGroup:v1:EQUITY'
  }

  // Set default status to ACTIVE if not provided
  if (!investment.investmentStatusRef) {
    investment.investmentStatusRef = 'InvestmentStatus:v1:ACTIVE'
  }

  return {
    investment,
    equityInvestment
  }
}
