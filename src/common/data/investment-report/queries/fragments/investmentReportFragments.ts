// Investment Report Fragments - Reusable GraphQL fragments for investment reports
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'

/**
 * Core Investment Report Fragment
 * Contains all fields from the InvestmentReport table
 */
export const INVESTMENT_REPORT = `
  id
  date
  investmentMarketValue
  forecastedRevenueAmount
  forecastedProfitAmount
  debtFinancingAmount
  requiredCapitalAmount
  stakePercentage
  fundManagerName
  identification
  totalInvestmentAmount
  
  # Additional metadata fields
  additionalProperties
  businessKey
  currencyRef
  processInstanceId
  synchronizedAt
  
  # LOAN FIELDS - Same as main investment table
  loanRecipientName
  loanAmount
  loanOpenCommitmentAmount
  loanInterestRate
  loanStartDate
  loanEndDate
  loanInterestClaim
  totalCommitmentAmount
  totalDistributionAmount
  
  ${AUDIT_FIELDS}
  
  # Catalog relationships
  investmentPhase { ${CATALOG_ENTRY} }
  currency { ${CATALOG_ENTRY} }
  
  # Loan recipient investment account relationship
  loanRecipientInvestmentAccount {
    id
    code
    name
    email
  }
  
  # Investment relationship - basic info only
  investment {
    id
    code
    name
    isin
    initialInvestmentAmount
    totalInvestmentAmount
    investmentMarketValue
    acquisitionDate
    plannedExitDate
    exitDate
    
    # Financial fields
    debtFinancingAmount
    requiredCapitalAmount
    forecastedRevenueAmount
    forecastedProfitAmount
    stakePercentage
    fundManagerName
    
    # Loan fields
    totalCommitmentAmount
    totalDistributionAmount
    loanRecipientName
    loanAmount
    loanOpenCommitmentAmount
    loanInterestRate
    loanStartDate
    loanEndDate
    loanInterestClaim
    
    # Basic investment info
    investmentType { ${CATALOG_ENTRY} }
    investmentGroup { ${CATALOG_ENTRY} }
    investmentStakeType { ${CATALOG_ENTRY} }
    currency {
      id
      code
      value
    }
    
    # Investment accounts via junction table (replaces direct investmentAccount)
    investmentAccounts(where: { isDeleted: { _eq: false } }) {
      id
      investmentAccountId
      investmentAccountTypeRef
      investmentAccount {
        id
        name
      }
    }
    
    # Loan recipient investment account (also available at report root level)
    loanRecipientInvestmentAccount {
      id
      code
      name
      email
    }
    
    # Investment Role relationships (array)
    investmentRole(where: { isDeleted: { _eq: false } }, orderBy: { displayOrder: ASC_NULLS_LAST }) {
      id
      displayOrder
      investmentRole {
        ${CATALOG_ENTRY}
      }
    }
  }
`

/**
 * Equity Investment Report Fragment
 * Type-specific fields for equity investment reports
 */
export const EQUITY_INVESTMENT_REPORT = `
  id
  date
  scope
  marketValue
  ebitdaAmount
  turnoverAmount
  equityInvestmentId
  
  # Additional metadata fields
  additionalProperties
  businessKey
  processInstanceId
  synchronizedAt
  
  ${AUDIT_FIELDS}
  
  equityInvestment {
    id
    foundationDate
    investment {
      id
      code
      name
      acquisitionDate
      investmentType { ${CATALOG_ENTRY} }
      investmentGroup { ${CATALOG_ENTRY} }
    }
  }
`

/**
 * Liquid Fund Investment Report Fragment
 * Type-specific fields for liquid fund investment reports
 */
export const LIQUID_FUND_INVESTMENT_REPORT = `
  id
  date
  interestRate
  bankAccountNumber
  bankName
  maturityDate
  proprietorName
  scope
  earlyTerminationAllowed
  liquidFundInvestmentId
  
  # Additional metadata fields
  additionalProperties
  businessKey
  processInstanceId
  synchronizedAt
  
  # Catalog reference fields
  interestPaymentFrequencyRef
  investmentLiquidFundTypeRef
  
  # Catalog relationships
  interestPaymentFrequency { ${CATALOG_ENTRY} }
  investmentLiquidFundType { ${CATALOG_ENTRY} }
  
  ${AUDIT_FIELDS}
  
  liquidFundInvestment {
    id
    additionalProperties
    investment {
      id
      name
      code
      isin
      additionalProperties
      # Investment accounts via junction table (replaces direct investmentAccount)
      investmentAccounts(where: { isDeleted: { _eq: false } }) {
        id
        investmentAccountId
        investmentAccount {
          id
          name
        }
      }
    }
    investmentLiquidFundType { ${CATALOG_ENTRY} }
  }
`

/**
 * Real Estate Investment Report Fragment
 * Type-specific fields for real estate investment reports
 */
export const REAL_ESTATE_INVESTMENT_REPORT = `
  id
  date
  occupancyPercent
  numberOfUnits
  annualNetColdRent
  actualAnnualExpenses
  funding
  liquidityForecast
  realEstateInvestmentId
  
  # Additional metadata fields
  additionalProperties
  businessKey
  processInstanceId
  synchronizedAt
  
  ${AUDIT_FIELDS}
  
  realEstateInvestment {
    id
    
    # Real estate specific fields
    buildingYear
    size
    sizeMeasurementUnitRef
    sizeMeasurementUnit { ${CATALOG_ENTRY} }
    numberOfUnits
    actualAnnualExpenses
    targetAnnualExpenses
    annualNetColdRent
    funding
    liquidityForecast
    
    investment {
      id
      code
      name
      investmentType { ${CATALOG_ENTRY} }
      investmentGroup { ${CATALOG_ENTRY} }
    }
  }
`
