/**
 * Equity Investment Import Types
 * Type definitions for equity investment CSV import with nested structure
 */

import { CommonInvestmentImportData } from '../../../types/commonInvestmentImportTypes'

/**
 * Equity Investment Specific Data
 * Fields unique to equity investments
 */
export interface EquityInvestmentImportData {
  foundationDate?: string
  marketValue?: number
  turnoverAmount?: number
  ebitdaAmount?: number
}

/**
 * Converted Equity Investment Structure
 * Represents the nested payload format required by the backend API
 * Separates common investment fields from equity-specific fields
 */
export interface ConvertedEquityInvestment {
  // Investment table fields (common across all investment types)
  investment: CommonInvestmentImportData

  // Equity Investment table fields (specialized equity data)
  equityInvestment: EquityInvestmentImportData
}
