// Investment Report Queries - Complete queries without custom fragments
// Using only common fragments: CATALOG_ENTRY, AUDIT_FIELDS
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments';

export interface InvestmentReportQueryVariables {
  investmentIds?: string[];
  reportType?: string;
  reportDateFrom?: string;
  reportDateTo?: string;
  reportScope?: string;
  currencyIds?: string[];
  limit?: number;
  offset?: number;
  orderBy?: Array<{
    field: string;
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST';
  }>;
}

export interface InvestmentTransactionQueryVariables {
  investmentIds?: string[];
  transactionType?: string;
  dateFrom?: string;
  dateTo?: string;
  currencyIds?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
}

export interface EquityInvestmentRoundQueryVariables {
  equityInvestmentIds?: string[];
  year?: number;
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
}

export interface RealEstateInvestmentRentalUnitQueryVariables {
  realEstateInvestmentIds?: string[];
  rentalUnitType?: string;
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
}

// Build where condition for Investment Report queries
export const buildInvestmentReportWhereCondition = (variables: InvestmentReportQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';

  // Filter by investment IDs
  if (variables.investmentIds?.length) {
    whereClause += `, investment: { id: { _in: [${variables.investmentIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  // Filter by date range
  if (variables.reportDateFrom || variables.reportDateTo) {
    let dateFilter = 'date: {';
    if (variables.reportDateFrom) {
      dateFilter += ` _gte: "${variables.reportDateFrom}"`;
    }
    if (variables.reportDateTo) {
      if (variables.reportDateFrom) {
        dateFilter += ',';
      }
      dateFilter += ` _lte: "${variables.reportDateTo}"`;
    }
    dateFilter += ' }';
    whereClause += `, ${dateFilter}`;
  }

  // Filter by report scope
  if (variables.reportScope) {
    whereClause += `, scope: { _eq: "${variables.reportScope}" }`;
  }

  // Filter by currency
  if (variables.currencyIds?.length) {
    whereClause += `, currency: { id: { _in: [${variables.currencyIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  whereClause += ' }';
  return whereClause;
};

// Get Investment Reports (general)
export const GET_INVESTMENT_REPORTS = (variables: InvestmentReportQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildInvestmentReportWhereCondition(variables);
  
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ date: DESC }]';

  return `
    query GetInvestmentReports {
      InvestmentReport(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        id
        date
        investmentMarketValue
        forecastedRevenueAmount
        forecastedProfitAmount
        debtFinancingAmount
        fundManagerName
        identification
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        investmentPhase { ${CATALOG_ENTRY} }
        currency { ${CATALOG_ENTRY} }
        
        # Investment relationship
        investment {
          id
          code
          name
          isin
          initialInvestmentAmount
          totalInvestmentAmount
          investmentMarketValue
          
          # Basic investment info
          investmentType {
            ${CATALOG_ENTRY}
          }
          investmentGroup {
            ${CATALOG_ENTRY}
          }
          currency {
            ${CATALOG_ENTRY}
          }
          
          # Investment account for proprietor information
          investmentAccount {
            id
            name
          }
        }
        
        # Specific report type relationships
        equityInvestmentReport {
          id
          date
          scope
          marketValue
          ebitdaAmount
          equityInvestmentId
          ${AUDIT_FIELDS}
          
          equityInvestment {
            id
            foundationDate
            investment {
              id
              code
              name
              investmentType {
                ${CATALOG_ENTRY}
              }
              investmentGroup {
                ${CATALOG_ENTRY}
              }
            }
          }
        }
        
        liquidFundInvestmentReport {
          id
          date
          interestRate
          bankAccountNumber
          bankName
          earlyTerminationAllowed
          maturityDate
          ${AUDIT_FIELDS}
          
          interestPaymentFrequency {
            ${CATALOG_ENTRY}
          }
          investmentLiquidFundType {
            ${CATALOG_ENTRY}
          }
          
          liquidFundInvestment {
            id
            maturityDate
            interestRate
            bankName
            
            investment {
              id
              name
              code
              
              investmentAccount {
                id
                name
              }
            }
          }
        }
        
        realEstateInvestmentReport {
          id
          date
          occupancyPercent
          numberOfUnits
          annualNetColdRent
          actualAnnualExpenses
          funding
          liquidityForecast
          ${AUDIT_FIELDS}
          
          realEstateInvestment {
            id
            locality
            buildingYear
          }
        }
        
        investmentRoleReport {
          id
          displayOrder
          ${AUDIT_FIELDS}
          
          investmentRole {
            ${CATALOG_ENTRY}
          }
        }
      }
      
      InvestmentReportAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `;
};

// Get Investment Report By ID
export const GET_INVESTMENT_REPORT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentReportById {
      InvestmentReport(
        where: { 
          id: { _eq: "${id}" }
          isDeleted: { _eq: false }
        }
      ) {
        id
        date
        scope
        plannedExitDate
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
        identification
        
        ${AUDIT_FIELDS}
        
        # Catalog references
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
        
        # Investment reference
        investment {
          id
          code
          name
          isin
          ${AUDIT_FIELDS}
        }
        
        # Loan recipient reference
        loanRecipientInvestmentAccount {
          id
          name
          code
          ${AUDIT_FIELDS}
        }
      }
    }
  `;
};

// Get Investment Transactions
export const GET_INVESTMENT_TRANSACTIONS = (variables: InvestmentTransactionQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  
  let whereClause = 'where: { isDeleted: { _eq: false }';
  
  // Filter by investment IDs
  if (variables.investmentIds?.length) {
    whereClause += `, investment: { id: { _in: [${variables.investmentIds.map(id => `"${id}"`).join(', ')}] } }`;
  }
  
  // Filter by transaction type
  if (variables.transactionType) {
    whereClause += `, investmentTransactionType: { code: { _eq: "${variables.transactionType}" } }`;
  }
  
  // Filter by date range
  if (variables.dateFrom) {
    whereClause += `, date: { _gte: "${variables.dateFrom}" }`;
  }
  
  if (variables.dateTo) {
    whereClause += `, date: { _lte: "${variables.dateTo}" }`;
  }
  
  // Filter by currency
  if (variables.currencyIds?.length) {
    whereClause += `, currency: { id: { _in: [${variables.currencyIds.map(id => `"${id}"`).join(', ')}] } }`;
  }
  
  // Search functionality
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim();
    whereClause += `, _or: [
      { code: { _ilike: "%${searchTerm}%" } },
      { comment: { _ilike: "%${searchTerm}%" } }
    ]`;
  }
  
  whereClause += ' }';
  
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ date: DESC }]';

  return `
    query GetInvestmentTransactions {
      InvestmentTransaction(
        ${whereClause}
        ${orderByClause}
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        code
        date
        amount
        comment
        
        ${AUDIT_FIELDS}
        
        # Catalog references
        investmentTransactionType {
          ${CATALOG_ENTRY}
        }
        currency {
          ${CATALOG_ENTRY}
        }
        
        # Investment reference
        investment {
          id
          code
          name
          isin
          ${AUDIT_FIELDS}
        }
      }
      
      InvestmentTransactionAggregate(${whereClause}) {
        aggregate {
          count
          sum {
            amount
          }
        }
      }
    }
  `;
};

// Get Investment Transaction By ID
export const GET_INVESTMENT_TRANSACTION_BY_ID = (id: string): string => {
  return `
    query GetInvestmentTransactionById {
      InvestmentTransaction(
        where: { 
          id: { _eq: "${id}" }
          isDeleted: { _eq: false }
        }
      ) {
        id
        code
        date
        amount
        comment
        ${AUDIT_FIELDS}
        
        # Catalog references
        investmentTransactionType {
          ${CATALOG_ENTRY}
        }
        currency {
          ${CATALOG_ENTRY}
        }
        
        # Investment reference
        investment {
          id
          code
          name
          isin
          ${AUDIT_FIELDS}
        }
      }
    }
  `;
};

// Get Equity Investment Rounds
export const GET_EQUITY_INVESTMENT_ROUNDS = (variables: EquityInvestmentRoundQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  
  let whereClause = 'where: { isDeleted: { _eq: false }';
  
  // Filter by equity investment IDs
  if (variables.equityInvestmentIds?.length) {
    whereClause += `, equityInvestment: { id: { _in: [${variables.equityInvestmentIds.map(id => `"${id}"`).join(', ')}] } }`;
  }
  
  // Filter by year
  if (variables.year) {
    const yearStart = `${variables.year}-01-01`;
    const yearEnd = `${variables.year}-12-31`;
    whereClause += `, date: { _gte: "${yearStart}", _lte: "${yearEnd}" }`;
  }
  
  // Search functionality
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim();
    whereClause += `, _or: [
      { roundNumber: { _ilike: "%${searchTerm}%" } }
    ]`;
  }
  
  whereClause += ' }';
  
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ date: DESC }]';

  return `
    query GetEquityInvestmentRounds {
      EquityInvestmentRound(
        ${whereClause}
        ${orderByClause}
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        date
        roundNumber
        roundAmount
        valuation
        ${AUDIT_FIELDS}
        
        # Catalog references
        roundType {
          ${CATALOG_ENTRY}
        }
        currency {
          ${CATALOG_ENTRY}
        }
        
        # Equity Investment reference
        equityInvestment {
          id
          marketValue
          ebitdaAmount
          foundationDate
          ${AUDIT_FIELDS}
          
          investment {
            id
            code
            name
            isin
            ${AUDIT_FIELDS}
          }
        }
      }
      
      EquityInvestmentRoundAggregate(${whereClause}) {
        aggregate {
          count
          sum {
            roundAmount
          }
        }
      }
    }
  `;
};

// Get Real Estate Investment Rental Units
export const GET_REAL_ESTATE_INVESTMENT_RENTAL_UNITS = (variables: RealEstateInvestmentRentalUnitQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  
  let whereClause = 'where: { isDeleted: { _eq: false }';
  
  // Filter by real estate investment IDs
  if (variables.realEstateInvestmentIds?.length) {
    whereClause += `, realEstateInvestment: { id: { _in: [${variables.realEstateInvestmentIds.map(id => `"${id}"`).join(', ')}] } }`;
  }
  
  // Filter by rental unit type
  if (variables.rentalUnitType) {
    whereClause += `, unitType: { code: { _eq: "${variables.rentalUnitType}" } }`;
  }
  
  // Search functionality
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim();
    whereClause += `, _or: [
      { unitNumber: { _ilike: "%${searchTerm}%" } }
    ]`;
  }
  
  whereClause += ' }';
  
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ unitNumber: ASC }]';

  return `
    query GetRealEstateInvestmentRentalUnits {
      RealEstateInvestmentRentalUnit(
        ${whereClause}
        ${orderByClause}
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        unitNumber
        size
        rentAmount
        isOccupied
        occupancyStartDate
        occupancyEndDate
        ${AUDIT_FIELDS}
        
        # Catalog references
        unitType {
          ${CATALOG_ENTRY}
        }
        currency {
          ${CATALOG_ENTRY}
        }
        sizeMeasurementUnit {
          ${CATALOG_ENTRY}
        }
        
        # Real Estate Investment reference
        realEstateInvestment {
          id
          size
          numberOfUnits
          propertyValue
          ${AUDIT_FIELDS}
          
          investment {
            id
            code
            name
            isin
            ${AUDIT_FIELDS}
          }
        }
      }
      
      RealEstateInvestmentRentalUnitAggregate(${whereClause}) {
        aggregate {
          count
          sum {
            size
            rentAmount
          }
        }
      }
    }
  `;
};

// NOTE: Specific investment report queries (GET_EQUITY_INVESTMENT_REPORTS, 
// GET_REAL_ESTATE_INVESTMENT_REPORTS, GET_LIQUID_FUND_INVESTMENT_REPORTS) 
// have been removed as all reports now use the enhanced GET_INVESTMENT_REPORTS 
// query with relationships above.
