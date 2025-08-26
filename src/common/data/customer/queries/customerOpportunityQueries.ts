// Customer Opportunity Queries - using shared fragments
import { CUSTOMER_OPPORTUNITY, CUSTOMER_ACCOUNT_REF } from './fragments/customerRelationFragments';

export interface CustomerOpportunityQueryVariables {
  ids?: string[];
  search?: string;
  accountIds?: string[];
  stageIds?: string[];
  pipelineIds?: string[];
  statusIds?: string[];
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

export const buildCustomerOpportunityWhereCondition = (variables: CustomerOpportunityQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';

  if (variables.search?.trim()) {
    const q = variables.search.trim();
    whereClause += `, _or: [
      { name: { _ilike: "%${q}%" } },
      { code: { _ilike: "%${q}%" } },
      { notesSummary: { _ilike: "%${q}%" } }
    ]`;
  }

  if (variables.accountIds?.length) whereClause += `, accountId: { _in: [${variables.accountIds.map(id => `"${id}"`).join(', ')}] }`;
  if (variables.stageIds?.length) whereClause += `, opportunityPipelineStage: { id: { _in: [${variables.stageIds.map(id => `"${id}"`).join(', ')}] } }`;
  if (variables.pipelineIds?.length) whereClause += `, opportunityPipeline: { id: { _in: [${variables.pipelineIds.map(id => `"${id}"`).join(', ')}] } }`;
  if (variables.statusIds?.length) whereClause += `, opportunityStatus: { id: { _in: [${variables.statusIds.map(id => `"${id}"`).join(', ')}] } }`;
  if (variables.currencyIds?.length) whereClause += `, currency: { id: { _in: [${variables.currencyIds.map(id => `"${id}"`).join(', ')}] } }`;
  if (variables.ownerEmployeeIds?.length) whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`;
  if (variables.forecastedProfitBetween) whereClause += `, forecastedProfitAmount: { _gte: ${variables.forecastedProfitBetween[0]}, _lte: ${variables.forecastedProfitBetween[1]} }`;
  if (variables.closeDateFrom) whereClause += `, closeDate: { _gte: "${variables.closeDateFrom}" }`;
  if (variables.closeDateTo) whereClause += `, closeDate: { _lte: "${variables.closeDateTo}" }`;

  whereClause += ' }';
  return whereClause;
};

export const GET_CUSTOMER_OPPORTUNITIES = (variables: CustomerOpportunityQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildCustomerOpportunityWhereCondition(variables);
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ closeDate: ASC }]';

  return `
    query GetCustomerOpportunities {
      CustomerOpportunity: Opportunity(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_OPPORTUNITY}
        account { ${CUSTOMER_ACCOUNT_REF} }
      }
      CustomerOpportunityAggregate: OpportunityAggregate(${where}) { aggregate { count } }
    }
  `;
};

export const GET_CUSTOMER_OPPORTUNITY_BY_ID = (id: string): string => {
  return `
    query GetCustomerOpportunityById {
      CustomerOpportunity: Opportunity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${CUSTOMER_OPPORTUNITY}
        account { ${CUSTOMER_ACCOUNT_REF} }
      }
    }
  `;
};

export const SEARCH_CUSTOMER_OPPORTUNITIES = (variables: CustomerOpportunityQueryVariables): string => {
  const { search = '', limit = 10 } = variables;
  return `
    query SearchCustomerOpportunities {
      CustomerOpportunity: Opportunity(
        where: {
          isDeleted: { _eq: false }
          _and: [ { _or: [
            { name: { _ilike: "%${search}%" } },
            { code: { _ilike: "%${search}%" } },
            { description: { _ilike: "%${search}%" } }
          ] } ]
        }
        limit: ${limit}
        orderBy: [{ name: ASC }]
      ) {
        id
        code
        name
        description
        closeDate
      }
    }
  `;
};


