/**
 * Liquid Fund Investment Import Types
 * Type definitions for liquid fund investment CSV import with nested structure
 */

import { CommonInvestmentImportData } from '../../../types/commonInvestmentImportTypes'

/**
 * Liquid Fund Investment Specific Data
 * Includes base fields and additional properties (JSON object)
 */
export interface LiquidFundInvestmentImportData {
  // Base liquid fund fields (database columns)
  investmentLiquidFundTypeRef?: string
  proprietorName?: string
  bankName?: string
  bankAccountNumber?: string
  earlyTerminationAllowed?: boolean
  interestRate?: number
  interestPaymentFrequencyRef?: string
  maturityDate?: string

  // Additional properties (JSON object with dynamic fields)
  additionalProperties?: {
    name?: string
    proprietor?: string
    bank?: string
    isin?: string
    currency?: string
    maturityDate?: string
    interestRate?: number
    quantity?: number
    openingBalance?: number
    incoming?: number
    outgoing?: number
    netIncome?: number
    incomeInterest?: number
    realizedGainsLosses?: number
    unrealizedGainsLosses?: number
    realizedGainsLossesCurrency?: number
    unrealizedGainsLossesCurrency?: number
    realizedGainsLossesSharePrice?: number
    unrealizedGainsLossesSharePrice?: number
    timeWeightedPerformance?: number
  }
}

/**
 * Converted Liquid Fund Investment Structure
 * Represents the nested payload format required by the backend API
 * Separates common investment fields from liquid fund-specific fields with nested additionalProperties
 */
export interface ConvertedLiquidFundInvestment {
  // Investment table fields (common across all investment types)
  investment: CommonInvestmentImportData

  // Liquid Fund Investment table fields (specialized liquid fund data + nested additional properties)
  liquidFundInvestment: LiquidFundInvestmentImportData
}
