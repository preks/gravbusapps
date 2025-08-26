// Investment Opportunity Queries - Complete queries using shared fragments
import { INVESTMENT } from './fragments/investmentFragments';
import { INVESTMENT_OPPORTUNITY, INVESTMENT_ACCOUNT_REF, INVESTMENT_TASK, INVESTMENT_ACTIVITY, INVESTMENT_NOTE, INVESTMENT_DOCUMENT } from './fragments/investmentRelationFragments';

export interface InvestmentOpportunityQueryVariables {
  ids?: string[];
  search?: string;
  accountIds?: string[];
  stageIds?: string[];
  pipelineIds?: string[];
  statusIds?: string[];
  leadSourceIds?: string[];
  currencyIds?: string[];
  ownerEmployeeIds?: string[];
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

  if (variables.statusIds?.length) {
    whereClause += `, opportunityStatus: { id: { _in: [${variables.statusIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.currencyIds?.length) {
    whereClause += `, currency: { id: { _in: [${variables.currencyIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.ownerEmployeeIds?.length) {
    whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`;
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
    ? `orderBy: [${variables.orderBy.map(o => {
        const f = o.field;
        if (f === 'opportunityStatus' || f === 'opportunityPipeline' || f === 'opportunityPipelineStage' || f === 'currency') {
          return `{ ${f}: { code: ${o.direction} } }`;
        }
        if (f === 'ownerEmployee') {
          return `{ ownerEmployee: { displayName: ${o.direction} } }`;
        }
        return `{ ${f}: ${o.direction} }`;
      }).join(', ')}]`
    : 'orderBy: [{ closeDate: ASC }]';

  return `
    query GetInvestmentOpportunities {
      InvestmentOpportunity(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_OPPORTUNITY}
        
        # Account relationship
        account {
          ${INVESTMENT_ACCOUNT_REF}
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
        ${INVESTMENT_OPPORTUNITY}
        
        # Account relationship
        account {
          ${INVESTMENT_ACCOUNT_REF}
        }
        
        # Related investments
        investment {
          ${INVESTMENT}
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

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES QUERIES
// =====================================================

// Get Investment Tasks by Opportunity ID
export const GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentTasksByOpportunityId {
      InvestmentTask(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_TASK}
        
        # Entity references
        opportunity {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Activities by Opportunity ID
export const GET_INVESTMENT_ACTIVITIES_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentActivitiesByOpportunityId {
      InvestmentActivity(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ occurredAt: DESC }]
      ) {
        ${INVESTMENT_ACTIVITY}
        
        # Entity references
        opportunity {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Notes by Opportunity ID
export const GET_INVESTMENT_NOTES_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentNotesByOpportunityId {
      InvestmentNote(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_NOTE}
        
        # Entity references
        opportunity {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Documents by Opportunity ID
export const GET_INVESTMENT_DOCUMENTS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentDocumentsByOpportunityId {
      InvestmentDocument(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT}
        
        # Entity references
        opportunity {
          id
          code
          name
        }
      }
    }
  `;
};