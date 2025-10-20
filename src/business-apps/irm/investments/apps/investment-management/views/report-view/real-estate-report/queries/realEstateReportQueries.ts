import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

export interface RealEstateReportQueryVariables {
  investmentType?: string
  startDate?: string
  endDate?: string
  currency?: string
  limit?: number
  offset?: number
}

// Real Estate Investment fragment with detailed fields
const REAL_ESTATE_INVESTMENT_DETAILS = `
  id
  buildingYear
  size
  sizeMeasurementUnit {
    ${CATALOG_ENTRY}
  }
  occupancyPercent
  annualNetColdRent
  funding
  targetAnnualExpenses
  actualAnnualExpenses
  numberOfUnits
  locality
  liquidityForecast
  ${AUDIT_FIELDS}
`

// Investment fragment with all fields needed for real estate reports
const INVESTMENT_FULL_DETAILS = `
  id
  name
  code
  isin
  acquisitionDate
  plannedExitDate
  exitDate
  initialInvestmentAmount
  totalInvestmentAmount
  investmentMarketValue
  debtFinancingAmount
  requiredCapitalAmount
  forecastedRevenueAmount
  forecastedProfitAmount
  stakePercentage
  loanRecipientName
  loanAmount
  loanOpenCommitmentAmount
  loanInterestRate
  loanStartDate
  loanEndDate
  loanInterestClaim
  totalCommitmentAmount
  totalDistributionAmount
  fundManagerName
  ${AUDIT_FIELDS}

  # Catalog relationships
  investmentType {
    ${CATALOG_ENTRY}
  }
  investmentStatus {
    ${CATALOG_ENTRY}
  }
  currency {
    ${CATALOG_ENTRY}
    code
  }

  # Employee relationship
  ownerEmployee {
    ${EMPLOYEE_REF}
    displayName
  }

  # Account relationship
  investmentAccount {
    id
    name
    code
    email
  }

  # Real estate investment details
  realEstateInvestment {
    ${REAL_ESTATE_INVESTMENT_DETAILS}
  }
`

// Build where condition for Investment queries with real estate filters
const buildRealEstateWhereCondition = (variables: RealEstateReportQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // Filter by real estate investment types
  const realEstateTypeIds = [
    'InvestmentType:v1:EXISTING_PROPERTY',
    'InvestmentType:v1:PROJECT_DEVELOPMENT',
    'InvestmentType:v1:MEZZANINE_LOANS',
    'InvestmentType:v1:OTHER_REAL_ESTATE'
  ]

  if (variables.investmentType) {
    // Filter by specific investment type if provided
    const typeMapping = {
      'Existing Properties': 'InvestmentType:v1:EXISTING_PROPERTY',
      'Project Development': 'InvestmentType:v1:PROJECT_DEVELOPMENT',
      'Mezzanine Loans': 'InvestmentType:v1:MEZZANINE_LOANS',
      Others: 'InvestmentType:v1:OTHER_REAL_ESTATE'
    }
    const mappedType = typeMapping[variables.investmentType as keyof typeof typeMapping]
    if (mappedType) {
      whereClause += `, investmentType: { id: { _eq: "${mappedType}" } }`
    }
  } else {
    // Filter by all real estate types if no specific type provided
    whereClause += `, investmentType: { id: { _in: [${realEstateTypeIds.map(id => `"${id}"`).join(', ')}] } }`
  }

  // Filter by acquisition date range if provided
  if (variables.startDate) {
    whereClause += `, acquisitionDate: { _gte: "${variables.startDate}" }`
  }
  if (variables.endDate) {
    whereClause += `, acquisitionDate: { _lte: "${variables.endDate}" }`
  }

  // Filter by currency if provided
  if (variables.currency) {
    whereClause += `, currency: { code: { _eq: "${variables.currency}" } }`
  }

  whereClause += ' }'
  return whereClause
}

// Get Real Estate Investments with full details
export const GET_REAL_ESTATE_INVESTMENTS = (variables: RealEstateReportQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 100, 1000)
  const offset = variables.offset || 0
  const where = buildRealEstateWhereCondition(variables)

  return `
    query GetRealEstateInvestments {
      Investment(
        limit: ${limit}
        offset: ${offset}
        orderBy: [{ createdAt: DESC }]
        ${where}
      ) {
        ${INVESTMENT_FULL_DETAILS}
      }
      
      InvestmentAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Real Estate Investments by specific type with enhanced fields for reports
export const GET_REAL_ESTATE_INVESTMENTS_BY_TYPE = (
  investmentType: string,
  variables: RealEstateReportQueryVariables = {}
): string => {
  const enhancedVariables = { ...variables, investmentType }
  return GET_REAL_ESTATE_INVESTMENTS(enhancedVariables)
}

// Search Real Estate Investments
export const SEARCH_REAL_ESTATE_INVESTMENTS = (
  searchTerm: string,
  variables: RealEstateReportQueryVariables = {}
): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const baseWhere = buildRealEstateWhereCondition(variables)

  // Add search conditions to the base where clause
  const searchWhere = baseWhere.replace(
    ' }',
    `, _or: [
      { name: { _ilike: "%${searchTerm}%" } },
      { code: { _ilike: "%${searchTerm}%" } },
      { isin: { _ilike: "%${searchTerm}%" } },
      { fundManagerName: { _ilike: "%${searchTerm}%" } },
      { loanRecipientName: { _ilike: "%${searchTerm}%" } }
    ] }`
  )

  return `
    query SearchRealEstateInvestments {
      Investment(
        limit: ${limit}
        offset: ${offset}
        orderBy: [{ createdAt: DESC }]
        ${searchWhere}
      ) {
        ${INVESTMENT_FULL_DETAILS}
      }
      
      InvestmentAggregate(${searchWhere}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Investment Roles for investment role information
export const GET_INVESTMENT_ROLES = (investmentId: string): string => {
  return `
    query GetInvestmentRoles {
      InvestmentRole(
        where: { 
          isDeleted: { _eq: false }
          investmentId: { _eq: "${investmentId}" }
        }
      ) {
        id
        investmentRole {
          ${CATALOG_ENTRY}
        }
        displayOrder
        ${AUDIT_FIELDS}
      }
    }
  `
}
