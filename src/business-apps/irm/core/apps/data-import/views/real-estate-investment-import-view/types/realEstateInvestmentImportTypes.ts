/**
 * Real Estate Investment Import Types
 * Type definitions for imported real estate investment data
 */

import { CommonInvestmentImportData } from '../../../types/commonInvestmentImportTypes'

/**
 * Real Estate Investment Specific Data
 * Fields unique to real estate investments
 */
export interface RealEstateInvestmentImportData {
  buildingYear?: string
  numberOfUnits?: number
  size?: number
  sizeMeasurementUnitRef?: string
  locality?: string
  postalCode?: string
  addressLine?: string
  countryRef?: string
  regionRef?: string
  annualNetColdRent?: number
  actualAnnualExpenses?: number
  targetAnnualExpenses?: number
  funding?: number
  occupancyPercent?: number
  marketValue?: number
  loanAmount?: number
  loanInterestRate?: number
  liquidityForecast?: any // JsonB field - can contain JSON string or object
}

/**
 * Converted Real Estate Investment Structure
 * Represents the nested payload format required by the backend API
 * Separates common investment fields from real estate-specific fields
 */
export interface ConvertedRealEstateInvestment {
  // Investment table fields (common investment data)
  investment: CommonInvestmentImportData

  // Real Estate Investment table fields (specialized real estate data)
  realEstateInvestment: RealEstateInvestmentImportData
}
