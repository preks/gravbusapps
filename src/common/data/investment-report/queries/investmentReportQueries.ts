// Investment Report Queries - Core investment report entities and their specializations
// Built using actual schema discovered via newwork-mcp
// This mirrors investmentQueries.ts but targets InvestmentReport tables instead of Investment tables
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments';

/**
 * Escapes GraphQL string values to prevent injection attacks
 * @param input - Raw string input from user
 * @returns Escaped string safe for GraphQL interpolation
 */
const escapeGraphQLString = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/\\/g, '\\\\')    // Escape backslashes first
    .replace(/"/g, '\\"')      // Escape double quotes
    .replace(/'/g, "\\'")      // Escape single quotes
    .replace(/\n/g, '\\n')     // Escape newlines
    .replace(/\r/g, '\\r')     // Escape carriage returns
    .replace(/\t/g, '\\t');    // Escape tabs
};

// Whitelist of allowed fields for orderBy to prevent injection attacks
const ORDERABLE_FIELDS = new Set([
  'date',
  'investmentMarketValue',
  'loanAmount',
  'createdAt',
  'updatedAt',
  'stakePercentage',
  'fundManagerName',
  'loanRecipientName',
  'forecastedRevenueAmount',
  'forecastedProfitAmount',
  'debtFinancingAmount',
  'requiredCapitalAmount'
]);

/**
 * Sanitizes orderBy array to prevent GraphQL injection attacks
 * @param arr - Array of order by objects with field and direction
 * @returns Sanitized array of GraphQL orderBy strings
 */
function sanitizeOrderBy(
  arr: Array<{ field: string; direction: 'ASC' | 'DESC' }>
): string[] {
  return arr
    .filter(o => ORDERABLE_FIELDS.has(o.field))
    .map(o => {
      const direction = o.direction === 'ASC' ? 'ASC' : 'DESC'; // Normalize direction
      return `{ ${o.field}: ${direction} }`;
    });
}

export interface InvestmentReportQueryVariables {
  // Basic filters
  ids?: string[];
  investmentIds?: string[];
  search?: string;
  
  // Investment relationship filters
  investmentTypeIds?: string[];
  investmentGroupIds?: string[];
  
  // Date ranges for reports
  reportDateFrom?: string;
  reportDateTo?: string;
  createdAfter?: string;
  createdBefore?: string;
  
  // Amount ranges (implemented)
  marketValueMinAmount?: number;
  marketValueMaxAmount?: number;
  loanMinAmount?: number;
  loanMaxAmount?: number;
  
  // Text filters (implemented)
  fundManagerNameContains?: string;
  loanRecipientNameContains?: string;
  
  // Type-specific investment IDs (implemented)
  equityInvestmentIds?: string[];
  liquidFundInvestmentIds?: string[];
  realEstateInvestmentIds?: string[];
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Sorting
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
}

// Investment Report Fragment - contains all the fields from InvestmentReport table
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
    
    # Basic investment info
    investmentType { ${CATALOG_ENTRY} }
    investmentGroup { ${CATALOG_ENTRY} }
    currency {
      id
      code
      value
    }
    
    # Investment account for proprietor information
    investmentAccount {
      id
      name
    }
  }
`;

// Build where conditions for InvestmentReport queries
export const buildInvestmentReportWhereCondition = (variables: InvestmentReportQueryVariables = {}) => {
  try {
    let whereClause = '{ ';
    const conditions: string[] = [];
    const orConditions: string[] = [];

    // Basic filters
    if (variables.ids?.length) {
      const safeIds = variables.ids.map(id => `"${escapeGraphQLString(id)}"`).join(', ');
      conditions.push(`id: { _in: [${safeIds}] }`);
    }

    if (variables.investmentIds?.length) {
      const safeInvestmentIds = variables.investmentIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ');
      conditions.push(`investment: { id: { _in: [${safeInvestmentIds}] } }`);
    }

    // Search across relevant text fields - add to OR conditions
    if (variables.search?.trim()) {
      const safeSearch = escapeGraphQLString(variables.search.trim());
      const searchPattern = `{ _ilike: "%${safeSearch}%" }`;
      orConditions.push(
        `{ loanRecipientName: ${searchPattern} }`,
        `{ fundManagerName: ${searchPattern} }`,
        `{ identification: ${searchPattern} }`,
        `{ investment: { name: ${searchPattern} } }`,
        `{ investment: { code: ${searchPattern} } }`,
        `{ investment: { isin: ${searchPattern} } }`
      );
    }

    // Date ranges - combine into single date condition to avoid duplicate keys
    if (variables.reportDateFrom || variables.reportDateTo) {
      const dateParts: string[] = [];
      if (variables.reportDateFrom) {
        dateParts.push(`_gte: "${escapeGraphQLString(variables.reportDateFrom)}"`);
      }
      if (variables.reportDateTo) {
        dateParts.push(`_lte: "${escapeGraphQLString(variables.reportDateTo)}"`);
      }
      conditions.push(`date: { ${dateParts.join(', ')} }`);
    }

    // Creation date range - combine into single createdAt condition to avoid duplicate keys
    if (variables.createdAfter || variables.createdBefore) {
      const createdAtParts: string[] = [];
      if (variables.createdAfter) {
        createdAtParts.push(`_gte: "${escapeGraphQLString(variables.createdAfter)}"`);
      }
      if (variables.createdBefore) {
        createdAtParts.push(`_lte: "${escapeGraphQLString(variables.createdBefore)}"`);
      }
      conditions.push(`createdAt: { ${createdAtParts.join(', ')} }`);
    }

    // Amount ranges
    if (typeof variables.marketValueMinAmount === 'number') {
      conditions.push(`investmentMarketValue: { _gte: ${variables.marketValueMinAmount} }`);
    }
    if (typeof variables.marketValueMaxAmount === 'number') {
      conditions.push(`investmentMarketValue: { _lte: ${variables.marketValueMaxAmount} }`);
    }

    if (typeof variables.loanMinAmount === 'number') {
      conditions.push(`loanAmount: { _gte: ${variables.loanMinAmount} }`);
    }
    if (typeof variables.loanMaxAmount === 'number') {
      conditions.push(`loanAmount: { _lte: ${variables.loanMaxAmount} }`);
    }

    // Text filters
    if (variables.fundManagerNameContains?.trim()) {
      const v = escapeGraphQLString(variables.fundManagerNameContains.trim());
      conditions.push(`fundManagerName: { _ilike: "%${v}%" }`);
    }
    if (variables.loanRecipientNameContains?.trim()) {
      const v = escapeGraphQLString(variables.loanRecipientNameContains.trim());
      conditions.push(`loanRecipientName: { _ilike: "%${v}%" }`);
    }

    // Investment-level filters (through relationship)
    if (variables.investmentTypeIds?.length) {
      const safeInvestmentTypeIds = variables.investmentTypeIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ');
      conditions.push(`investment: { investmentType: { id: { _in: [${safeInvestmentTypeIds}] } } }`);
    }
    if (variables.investmentGroupIds?.length) {
      const safeInvestmentGroupIds = variables.investmentGroupIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ');
      conditions.push(`investment: { investmentGroup: { id: { _in: [${safeInvestmentGroupIds}] } } }`);
    }

    // Type-specific investment filters - use AND conditions for precise filtering
    if (variables.equityInvestmentIds?.length) {
      const safeEquityInvestmentIds = variables.equityInvestmentIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ');
      conditions.push(`equityInvestmentReport: { equityInvestmentId: { _in: [${safeEquityInvestmentIds}] } }`);
    }
    if (variables.liquidFundInvestmentIds?.length) {
      const safeLiquidFundInvestmentIds = variables.liquidFundInvestmentIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ');
      conditions.push(`liquidFundInvestmentReport: { liquidFundInvestmentId: { _in: [${safeLiquidFundInvestmentIds}] } }`);
    }
    if (variables.realEstateInvestmentIds?.length) {
      const safeRealEstateInvestmentIds = variables.realEstateInvestmentIds.map(id => `"${escapeGraphQLString(id)}"`).join(', ');
      conditions.push(`realEstateInvestmentReport: { realEstateInvestmentId: { _in: [${safeRealEstateInvestmentIds}] } }`);
    }

    // Add consolidated OR conditions if any exist
    if (orConditions.length > 0) {
      conditions.push(`_or: [${orConditions.join(', ')}]`);
    }

    // Soft delete filter
    conditions.push('isDeleted: { _eq: false }');

    whereClause += conditions.join(', ');
    whereClause += ' }';
    return `where: ${whereClause}`;
  } catch (error) {
    console.error('Error building where conditions:', error);
    console.error('Variables that caused the error:', variables);
    // Return a basic fallback condition
    return 'where: { isDeleted: { _eq: false } }';
  }
};

// Get Investment Reports with all specializations
export const GET_INVESTMENT_REPORTS = (variables: InvestmentReportQueryVariables = {}): string => {
  const requestedLimit = variables.limit ?? 50;
  const limit = Math.min(Math.max(requestedLimit, 1), 10000);
  const offset = variables.offset || 0;
  const where = buildInvestmentReportWhereCondition(variables);
  
  // Build orderBy clause with sanitization to prevent injection attacks
  const sanitizedOrderBy = variables.orderBy?.length ? sanitizeOrderBy(variables.orderBy) : [];
  const orderByClause = sanitizedOrderBy.length > 0
    ? `orderBy: [${sanitizedOrderBy.join(', ')}]`
    : 'orderBy: [{ date: DESC }]';


  const query = `
    query GetInvestmentReports {
      InvestmentReport(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_REPORT}
        
        # Type-specific report relationships
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
              acquisitionDate
              forecastedProfitAmount
              forecastedRevenueAmount
              fundManagerName
              investmentType { ${CATALOG_ENTRY} }
              investmentGroup { ${CATALOG_ENTRY} }
            }
          }
        }
        
        liquidFundInvestmentReport {
          id
          date
          interestRate
          bankAccountNumber
          bankName
          maturityDate
          proprietorName
          scope
          additionalProperties
          earlyTerminationAllowed
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
              investmentAccount {
                id
                name
              }
            }
            investmentLiquidFundType { ${CATALOG_ENTRY} }
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
        }
      }
      
      InvestmentReportAggregate(
        ${where}
      ) {
        aggregate {
          count
        }
      }
    }
  `;
  
  
  return query;
};

// Get Investment Report By ID
export const GET_INVESTMENT_REPORT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentReportById {
      InvestmentReport(
        where: { 
          id: { _eq: ${JSON.stringify(id)} }
          isDeleted: { _eq: false }
        }
      ) {
        ${INVESTMENT_REPORT}
        
        # Type-specific report relationships
        equityInvestmentReport {
          id
          date
          scope
          marketValue
          ebitdaAmount
          equityInvestmentId
          ${AUDIT_FIELDS}
        }
        
        liquidFundInvestmentReport {
          id
          date
          interestRate
          bankAccountNumber
          bankName
          maturityDate
          proprietorName
          scope
          additionalProperties
          earlyTerminationAllowed
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
              investmentAccount {
                id
                name
              }
            }
            investmentLiquidFundType { ${CATALOG_ENTRY} }
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
        }
      }
    }
  `;
};

// Get Investment Reports by Investment ID
export const GET_INVESTMENT_REPORTS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentReportsByInvestmentId {
      InvestmentReport(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }
          isDeleted: { _eq: false }
        }
        orderBy: [{ date: DESC }]
      ) {
        ${INVESTMENT_REPORT}
      }
    }
  `;
};

// Search Investment Reports (lightweight for autocomplete)
export const SEARCH_INVESTMENT_REPORTS = (variables: InvestmentReportQueryVariables): string => {
  const { limit = 10 } = variables;
  const whereCondition = buildInvestmentReportWhereCondition(variables);
  
  return `
    query SearchInvestmentReports {
      InvestmentReport(
        ${whereCondition}
        limit: ${limit}
        orderBy: [{ date: DESC }]
      ) {
        id
        date
        loanRecipientName
        loanAmount
        investmentMarketValue
        
        investment {
          id
          code
          name
          investmentType { ${CATALOG_ENTRY} }
          investmentGroup { ${CATALOG_ENTRY} }
        }
      }
    }
  `;
};
