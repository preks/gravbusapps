// Investment Opportunity Queries - Complete queries without custom fragments
// Using only common fragments: CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE
import { CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE } from '@/common/network/graphql/commonFragments';

export interface InvestmentOpportunityQueryVariables {
  ids?: string[];
  search?: string;
  accountIds?: string[];
  stageIds?: string[];
  pipelineIds?: string[];
  leadSourceIds?: string[];
  currencyIds?: string[];
  ownerEmployeeIds?: string[];
  estimatedAmountBetween?: [number, number];
  forecastedProfitBetween?: [number, number];
  closeDateFrom?: string;
  closeDateTo?: string;
  limit?: number;
  offset?: number;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
}

// Build where condition for Investment Opportunity queries
export const buildInvestmentOpportunityWhereCondition = (variables: InvestmentOpportunityQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';
  
  // Search across multiple fields (only using fields that exist in the schema)
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim();
    whereClause += `, _or: [
      { name: { _ilike: "%${searchTerm}%" } },
      { code: { _ilike: "%${searchTerm}%" } },
      { notesSummary: { _ilike: "%${searchTerm}%" } },
      { investmentName: { _ilike: "%${searchTerm}%" } }
    ]`;
  }

  // Filter by specific fields
  if (variables.accountIds?.length) {
    whereClause += `, accountId: { _in: [${variables.accountIds.map(id => `"${id}"`).join(', ')}] }`;
  }

  if (variables.stageIds?.length) {
    whereClause += `, opportunityPipelineStage: { id: { _in: [${variables.stageIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.pipelineIds?.length) {
    whereClause += `, opportunityPipeline: { id: { _in: [${variables.pipelineIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.currencyIds?.length) {
    whereClause += `, currency: { id: { _in: [${variables.currencyIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.ownerEmployeeIds?.length) {
    whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.estimatedAmountBetween) {
    whereClause += `, estimatedAmount: { _gte: ${variables.estimatedAmountBetween[0]}, _lte: ${variables.estimatedAmountBetween[1]} }`;
  }

  if (variables.forecastedProfitBetween) {
    whereClause += `, forecastedProfitAmount: { _gte: ${variables.forecastedProfitBetween[0]}, _lte: ${variables.forecastedProfitBetween[1]} }`;
  }

  if (variables.closeDateFrom) {
    whereClause += `, closeDate: { _gte: "${variables.closeDateFrom}" }`;
  }

  if (variables.closeDateTo) {
    whereClause += `, closeDate: { _lte: "${variables.closeDateTo}" }`;
  }

  whereClause += ' }';
  return whereClause;
};

// Get Investment Opportunities with full details
export const GET_INVESTMENT_OPPORTUNITIES = (variables: InvestmentOpportunityQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildInvestmentOpportunityWhereCondition(variables);
  
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ closeDate: ASC }]';

  return `
    query GetInvestmentOpportunities {
      InvestmentOpportunity(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        id
        code
        name
        estimatedAmount
        forecastedProfitAmount
        initialInvestmentAmount
        closeDate
        
        
        annualNetColdRent
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        
        currency {
          ${CATALOG_ENTRY}
        }
        
        
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE}
        }
        
        # Account relationship
        account {
          id
          code
          name
        }
        
        # Aggregate counts for relationships
        investmentAggregate {
          aggregate {
            count
          }
        }
        investmentActivityAggregate {
          aggregate {
            count
          }
        }
        investmentDocumentAggregate {
          aggregate {
            count
          }
        }
        investmentNoteAggregate {
          aggregate {
            count
          }
        }
        investmentTaskAggregate {
          aggregate {
            count
          }
        }
      }
      
      InvestmentOpportunityAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `;
};

// Get Investment Opportunity by ID
export const GET_INVESTMENT_OPPORTUNITY_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityById {
      InvestmentOpportunity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        id
        code
        name
        estimatedAmount
        forecastedProfitAmount
        initialInvestmentAmount
        closeDate
        annualNetColdRent
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        
        currency {
          ${CATALOG_ENTRY}
        }
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE}
        }
        
        # Account relationship
        account {
          id
          code
          name
          email
          geographicPresence
          industryClass {
            ${CATALOG_ENTRY}
          }
          companySize {
            ${CATALOG_ENTRY}
          }
          ownerEmployee {
            id
            displayName
          }
        }
        
        # Related investments
        investment {
          id
          code
          name
          initialInvestmentAmount
          totalInvestmentAmount
          investmentMarketValue
          acquisitionDate
          exitDate
          
          # Investment type info
          investmentType {
            ${CATALOG_ENTRY}
          }
          investmentStatus {
            ${CATALOG_ENTRY}
          }
          currency {
            ${CATALOG_ENTRY}
          }
        }
      }
    }
  `;
};

// Search Investment Opportunities (lightweight for autocomplete)
export const SEARCH_INVESTMENT_OPPORTUNITIES = (variables: InvestmentOpportunityQueryVariables): string => {
  const { search = '', limit = 10 } = variables;
  
  return `
    query SearchInvestmentOpportunities {
      InvestmentOpportunity(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { name: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } },
                { description: { _ilike: "%${search}%" } }
              ]
            }
          ]
        }
        limit: ${limit}
        orderBy: [{ name: ASC }]
      ) {
        id
        code
        name
        description
        estimatedAmount
        probability
        closeDate
        stage {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
        ownerEmployee {
          id
          displayName
        }
        account {
          id
          code
          name
        }
      }
    }
  `;
};