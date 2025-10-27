import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

export const INVESTMENT_REF = `
    id
    code
    name
    isin
    initialInvestmentAmount
    totalInvestmentAmount
    investmentMarketValue
    acquisitionDate
    exitDate
    additionalProperties
    
    # Basic investment info
    investmentType {
    ${CATALOG_ENTRY}
    }
    currency {
    ${CATALOG_ENTRY}
    }
`

export const INVESTMENT = `
    id
    code
    name
    isin
    acquisitionDate
    planedExit
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
    additionalProperties
    ${AUDIT_FIELDS}

    # Catalog relationships
    investmentGroup {
        ${CATALOG_ENTRY}
    }
    investmentType {
        ${CATALOG_ENTRY}
    }
    investmentStakeType {
        ${CATALOG_ENTRY}
    }
    investmentPhase {
        ${CATALOG_ENTRY}
    }
    investmentStatus {
        ${CATALOG_ENTRY}
    }
    investmentRiskLevel {
        ${CATALOG_ENTRY}
    }
    currency {
        ${CATALOG_ENTRY}
    }

    # Employee relationship
    ownerEmployee {
        ${EMPLOYEE_REF}
    }
    
    # Investment Role relationships (array)
    investmentRole(where: { isDeleted: { _eq: false } }, orderBy: { displayOrder: ASC_NULLS_LAST }) {
        id
        version
        displayOrder
        isDeleted
        investmentRole {
            ${CATALOG_ENTRY}
        }
    }
`

// Investment specialization fragments
export const EQUITY_INVESTMENT_REF = `
    id
    foundationDate
    marketValue
    ebitdaAmount
    turnoverAmount
    additionalProperties
`

export const EQUITY_INVESTMENT = `
    id
    version
    foundationDate
    marketValue
    turnoverAmount
    ebitdaAmount
    additionalProperties
    ${AUDIT_FIELDS}
    
    # Investment relationship
    investment {
        id
        name
        code
    }
    
    # Investment rounds (only active, non-deleted rounds)
    equityInvestmentRound(where: { isDeleted: { _eq: false } }, orderBy: { year: DESC_NULLS_LAST }) {
        id
        name
        year
        preValue
        investmentVolume
        volumeShare
        roundSharePercentage
        currencyRef
        currency {
            ${CATALOG_ENTRY}
        }
        additionalProperties
        ${AUDIT_FIELDS}
    }
    
    # Investment reports (only active, non-deleted reports)
    equityInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
        id
        date
        marketValue
        additionalProperties
    }
`

export const REAL_ESTATE_INVESTMENT_REF = `
    id
    buildingYear
    numberOfUnits
    annualNetColdRent
    actualAnnualExpenses
    targetAnnualExpenses
    funding
    occupancyPercent
    size
    sizeMeasurementUnitRef
    locality
    postalCode
    additionalProperties
`

export const REAL_ESTATE_INVESTMENT = `
    id
    version
    buildingYear
    numberOfUnits
    annualNetColdRent
    actualAnnualExpenses
    targetAnnualExpenses
    funding
    occupancyPercent
    size
    locality
    postalCode
    addressLine
    liquidityForecast
    additionalProperties
    ${AUDIT_FIELDS}
    
    # Investment relationship
    investment {
        id
        name
        code
    }
    
    # Location relationships
    country {
        ${CATALOG_ENTRY}
    }
    region {
        ${CATALOG_ENTRY}
    }
    
    # Size measurement unit
    sizeMeasurementUnit {
        ${CATALOG_ENTRY}
    }
    
    # Investment reports (only active, non-deleted reports)
    realEstateInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
        id
        date
        actualAnnualExpenses
        annualNetColdRent
        funding
        numberOfUnits
        occupancyPercent
        size
        sizeMeasurementUnitRef
        liquidityForecast
        additionalProperties
        ${AUDIT_FIELDS}
    }
`

export const LIQUID_FUND_INVESTMENT_REF = `
    id
    proprietorName
    bankName
    bankAccountNumber
    earlyTerminationAllowed
    interestRate
    maturityDate
    additionalProperties
    
    # Investment liquid fund type
    investmentLiquidFundType {
        ${CATALOG_ENTRY}
    }
`

export const LIQUID_FUND_INVESTMENT = `
    id
    version
    proprietorName
    bankName
    bankAccountNumber
    earlyTerminationAllowed
    interestRate
    maturityDate
    additionalProperties
    ${AUDIT_FIELDS}
    
    # Investment relationship
    investment {
        id
        name
        code
    }
    
    # Investment liquid fund type
    investmentLiquidFundType {
        ${CATALOG_ENTRY}
    }
    
    # Interest payment frequency
    interestPaymentFrequency {
        ${CATALOG_ENTRY}
    }
    
    # Investment reports (only active, non-deleted reports)
    liquidFundInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
        id
        date
        interestRate
        maturityDate
        proprietorName
        bankName
        bankAccountNumber
        earlyTerminationAllowed
        interestPaymentFrequencyRef
        investmentLiquidFundTypeRef
        additionalProperties
        ${AUDIT_FIELDS}
    }
`
