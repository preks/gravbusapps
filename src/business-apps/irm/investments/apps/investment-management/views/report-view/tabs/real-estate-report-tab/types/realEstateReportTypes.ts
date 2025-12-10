import { CatalogEntry } from '@/common/types/CatalogTypes'
import { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

// Enhanced real estate investment interface with real data fields
export interface EnhancedRealEstateInvestment {
  // Basic investment information
  id: string
  name: string
  code?: string
  isin?: string

  // Investment type and classification
  investmentType: CatalogEntry
  investmentStatus?: CatalogEntry
  currency: CatalogEntry & { code: string }

  // Financial information
  initialInvestmentAmount?: number | null
  totalInvestmentAmount?: number | null
  investmentMarketValue?: number | null
  debtFinancingAmount?: number | null
  requiredCapitalAmount?: number | null
  forecastedRevenueAmount?: number | null
  forecastedProfitAmount?: number | null
  stakePercentage?: number | null

  // Loan information (for mezzanine loans)
  loanRecipientName?: string | null
  loanAmount?: number | null
  loanOpenCommitmentAmount?: number | null
  loanInterestRate?: number | null
  loanStartDate?: string | null
  loanEndDate?: string | null
  loanInterestClaim?: number | null

  // Fund information (for others type)
  totalCommitmentAmount?: number | null
  totalDistributionAmount?: number | null
  fundManagerName?: string | null

  // Dates
  acquisitionDate?: string | null
  plannedExitDate?: string | null
  exitDate?: string | null

  // Relationships
  ownerEmployee?: EmployeeRef | null
  investmentAccounts?: Array<{
    // GraphQL field name
    id: string
    investmentAccountId: string
    investmentAccount?: {
      id: string
      name?: string
      code?: string
      email?: string
    }
  }> | null

  // Real estate specific information
  realEstateInvestment?: RealEstateInvestmentDetail[] | null

  // Computed properties for UI
  propertyName: string
  buildingYear?: string
  size?: number
  sizeMeasurementUnit?: string
  occupancyPercent?: number
  annualNetColdRent?: number
  funding?: number
  targetAnnualExpenses?: number
  actualAnnualExpenses?: number
  numberOfUnits?: number
  locality?: string
  currencyCode: string
  ownerDisplayName?: string
  investmentRole?: string
  statusBadgeVariant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  performanceAmount?: number
  performancePercentage?: number
  performanceBadgeVariant: 'default' | 'success' | 'destructive'
  holdingPeriod?: string
}

// Real estate investment detail interface
export interface RealEstateInvestmentDetail {
  id: string
  buildingYear?: string
  size?: number
  sizeMeasurementUnit?: CatalogEntry
  occupancyPercent?: number
  annualNetColdRent?: number
  funding?: number
  targetAnnualExpenses?: number
  actualAnnualExpenses?: number
  numberOfUnits?: number
  locality?: string
  liquidityForecast?: any
}

// Investment role interface
export interface InvestmentRole {
  id: string
  investmentRole: CatalogEntry
  displayOrder?: number
}

// Query response interfaces
export interface RealEstateInvestmentResponse {
  Investment: any[]
  InvestmentAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentRoleResponse {
  InvestmentRole: InvestmentRole[]
}

// Enhanced filters for real estate reports
export interface RealEstateReportFilters {
  investmentType?: string
  startDate?: string
  endDate?: string
  currencyIds?: string[]
  search?: string
  limit?: number
  offset?: number
}

// Table-specific interfaces for each investment type
export interface ExistingPropertiesData extends EnhancedRealEstateInvestment {
  // Specific fields that are most relevant for existing properties
  buildingYear: string
  size: number
  sizeMeasurementUnit: string
  occupancyPercent: number
  totalInvestmentAmount: number
  annualNetColdRent: number
  funding: number
  investmentRole: string
  stakePercentage: number
  holdingPeriod: string
}

export interface ProjectDevelopmentData extends EnhancedRealEstateInvestment {
  // Specific fields that are most relevant for project development
  holdingPeriod: string
  acquisitionDate: string
  plannedExitDate: string
  totalInvestmentAmount: number
  requiredCapitalAmount: number
  debtFinancingAmount: number
  targetAnnualExpenses: number
  forecastedRevenueAmount: number
  forecastedProfitAmount: number
}

export interface MezzanineLoansData extends EnhancedRealEstateInvestment {
  // Specific fields that are most relevant for mezzanine loans
  loanRecipientName: string
  loanAmount: number
  loanOpenCommitmentAmount: number
  loanInterestRate: number
  loanStartDate: string
  loanEndDate: string
  loanInterestClaim: number
}

export interface OthersData extends EnhancedRealEstateInvestment {
  // Specific fields that are most relevant for other types
  fundManagerName: string
  totalCommitmentAmount: number
  totalInvestmentAmount: number // Used as "Contribution"
  totalDistributionAmount: number
  forecastedProfitAmount: number
}
