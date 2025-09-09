// Investment Queries - Core investment entities and their specializations
// Built using actual schema discovered via newwork-mcp
import { CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE } from '@/common/network/graphql/commonFragments';
import { INVESTMENT } from './fragments/investmentFragments';
import { INVESTMENT_OPPORTUNITY_REF, INVESTMENT_ACTIVITY, INVESTMENT_TASK, INVESTMENT_NOTE, INVESTMENT_DOCUMENT } from './fragments/investmentRelationFragments';

export interface InvestmentQueryVariables {
  ids?: string[];
  search?: string;
  investmentTypeIds?: string[];
  investmentStatusIds?: string[];
  investmentGroupIds?: string[];
  currencyIds?: string[];
  ownerEmployeeIds?: string[];
  accountIds?: string[];
  opportunityIds?: string[];
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
  exitDateFrom?: string;
  exitDateTo?: string;
  plannedExitDateFrom?: string;
  plannedExitDateTo?: string;
  limit?: number;
  offset?: number;
  orderBy?: Array<{
    field: string;
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST';
  }>;
}

// Build where condition for Investment queries
export const buildInvestmentWhereCondition = (variables: InvestmentQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';
  
  // Search across multiple fields (only using fields that exist in the schema)
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim();
    whereClause += `, _or: [
      { name: { _ilike: "%${searchTerm}%" } },
      { code: { _ilike: "%${searchTerm}%" } },
      { isin: { _ilike: "%${searchTerm}%" } },
      { fundManagerName: { _ilike: "%${searchTerm}%" } },
      { loanRecipientName: { _ilike: "%${searchTerm}%" } }
    ]`;
  }

  // Filter by specific fields
  if (variables.investmentTypeIds?.length) {
    whereClause += `, investmentType: { id: { _in: [${variables.investmentTypeIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.investmentStatusIds?.length) {
    whereClause += `, investmentStatus: { id: { _in: [${variables.investmentStatusIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.investmentGroupIds?.length) {
    whereClause += `, investmentGroup: { id: { _in: [${variables.investmentGroupIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.currencyIds?.length) {
    whereClause += `, currency: { id: { _in: [${variables.currencyIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.ownerEmployeeIds?.length) {
    whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.accountIds?.length) {
    whereClause += `, investmentAccount: { id: { _in: [${variables.accountIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.opportunityIds?.length) {
    whereClause += `, investmentOpportunity: { id: { _in: [${variables.opportunityIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.acquisitionDateFrom) {
    whereClause += `, acquisitionDate: { _gte: "${variables.acquisitionDateFrom}" }`;
  }

  if (variables.acquisitionDateTo) {
    whereClause += `, acquisitionDate: { _lte: "${variables.acquisitionDateTo}" }`;
  }

  if (variables.exitDateFrom) {
    whereClause += `, exitDate: { _gte: "${variables.exitDateFrom}" }`;
  }

  if (variables.exitDateTo) {
    whereClause += `, exitDate: { _lte: "${variables.exitDateTo}" }`;
  }

  if (variables.plannedExitDateFrom) {
    whereClause += `, plannedExitDate: { _gte: "${variables.plannedExitDateFrom}" }`;
  }

  if (variables.plannedExitDateTo) {
    whereClause += `, plannedExitDate: { _lte: "${variables.plannedExitDateTo}" }`;
  }

  whereClause += ' }';
  return whereClause;
};

// Get Investments with all specializations
export const GET_INVESTMENTS = (variables: InvestmentQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildInvestmentWhereCondition(variables);
  
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ createdAt: DESC }]';

  return `
    query GetInvestments {
      Investment(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT}  
        
        # Entity relationships
        investmentAccount {
          id
          code
          name
          email
          foundationDate
          geographicPresence
          companySize {
            ${CATALOG_ENTRY}
          }
          accountAnnualRevenueBand {
            ${CATALOG_ENTRY}
          }
          industryClass {
            ${CATALOG_ENTRY}
          }
          investmentAccountContact {
            contactType
            contact {
              id
              firstName
              lastName
              fullName
              email
              phone
              department
              jobPosition
              ${AUDIT_FIELDS}
            }
          }
        }
        investmentOpportunity {
          ${INVESTMENT_OPPORTUNITY_REF}
        }
        
        # Equity Investment specialization
        equityInvestment {
          id
          foundationDate
          marketValue
          ebitdaAmount
          turnoverAmount
          additionalProperties
          ${AUDIT_FIELDS}
        }
        
        # Real Estate Investment specialization
        realEstateInvestment {
          id
          buildingYear
          annualNetColdRent
          actualAnnualExpenses
          occupancyPercent
          locality
          country {
            ${CATALOG_ENTRY}
          }
        }
        
        # Liquid Fund Investment specialization
        liquidFundInvestment {
          id
          bankName
          bankAccountNumber
          earlyTerminationAllowed
          interestRate
          investmentLiquidFundType {
            ${CATALOG_ENTRY}
          }
        }
      }
      
      InvestmentAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `;
};

// Get Investment Activities by Investment ID
export const GET_INVESTMENT_ACTIVITIES_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentActivitiesByInvestmentId {
      InvestmentActivity(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ occurredAt: DESC }]
      ) {
        ${INVESTMENT_ACTIVITY}
        
        # Entity references
        investment {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Tasks by Investment ID
export const GET_INVESTMENT_TASKS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentTasksByInvestmentId {
      InvestmentTask(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_TASK}
        
        # Entity references
        investment {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Notes by Investment ID
export const GET_INVESTMENT_NOTES_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentNotesByInvestmentId {
      InvestmentNote(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_NOTE}
        
        # Entity references
        investment {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Note by ID
export const GET_INVESTMENT_NOTE_BY_ID = (noteId: string): string => {
  return `
    query GetInvestmentNoteById {
      InvestmentNote(
        where: { 
          id: { _eq: "${noteId}" }, 
          isDeleted: { _eq: false } 
        }
      ) {
        ${INVESTMENT_NOTE}
        
        # Entity references
        investment {
          id
          code
          name
        }
        account {
          id
          name
        }
        contact {
          id
          firstName
          lastName
        }
        lead {
          id
          firstName
          lastName
        }
        opportunity {
          id
          name
        }
      }
    }
  `;
};

// Get Investment Documents by Investment ID
export const GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentDocumentsByInvestmentId {
      InvestmentDocument(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT}
        
        # Entity references
        investment {
          id
          code
          name
        }
        
        # Parent document reference (for folders)
        parentDocument {
          id
          name
          description
        }
        
        # Related activity and task references
        activity {
          id
          title
          description
        }
        task {
          id
          name
          description
        }
      }
    }
  `;
};

// Get Investment by ID with full details
export const GET_INVESTMENT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentById {
      Investment(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT}
        
        # Entity relationships
        investmentAccount {
          id
          code
          name
          email
          foundationDate
          geographicPresence
          companySize {
            ${CATALOG_ENTRY}
          }
          accountAnnualRevenueBand {
            ${CATALOG_ENTRY}
          }
          industryClass {
            ${CATALOG_ENTRY}
          }
          investmentAccountContact {
            contactType
            contact {
              id
              firstName
              lastName
              fullName
              email
              phone
              department
              jobPosition
              ${AUDIT_FIELDS}
            }
          }
        }
        
        # Loan recipient investment account
        loanRecipientInvestmentAccount {
          id
          code
          name
          email
          foundationDate
          geographicPresence
          companySize {
            ${CATALOG_ENTRY}
          }
          accountAnnualRevenueBand {
            ${CATALOG_ENTRY}
          }
          industryClass {
            ${CATALOG_ENTRY}
          }
          ${AUDIT_FIELDS}
        }
        
        # All investment specializations with full details
        equityInvestment {
          id
          foundationDate
          marketValue
          ebitdaAmount
          turnoverAmount
          ${AUDIT_FIELDS}
          
          # Investment rounds
          equityInvestmentRound {
            id
            name
            year
            preValue
            investmentVolume
            volumeShare
            roundSharePercentage
            currency {
              ${CATALOG_ENTRY}
            }
            ${AUDIT_FIELDS}
          }
        }
        
        realEstateInvestment {
          id
          buildingYear
          numberOfUnits
          annualNetColdRent
          actualAnnualExpenses
          funding
          occupancyPercent
          locality
          addressLine
          ${AUDIT_FIELDS}
          country {
            ${CATALOG_ENTRY}
          }
        }
        
        liquidFundInvestment {
          id
          bankName
          bankAccountNumber
          earlyTerminationAllowed
          interestRate
          ${AUDIT_FIELDS}
          investmentLiquidFundType {
            ${CATALOG_ENTRY}
          }
          interestPaymentFrequency {
            ${CATALOG_ENTRY}
          }
          liquidFundInvestmentReport {
            id
            date
            interestRate
            maturityDate
          }
        }
      }
    }
  `;
};

// Search Investments (lightweight for autocomplete)
export const SEARCH_INVESTMENTS = (variables: InvestmentQueryVariables): string => {
  const { search = '', limit = 10 } = variables;
  
  return `
    query SearchInvestments {
      Investment(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { name: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } },
                { isin: { _ilike: "%${search}%" } },
                { fundManagerName: { _ilike: "%${search}%" } }
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
        isin
        initialInvestmentAmount
        totalInvestmentAmount
        investmentMarketValue
        acquisitionDate
        exitDate
        stakePercentage
        
        investmentType {
          ${CATALOG_ENTRY}
        }
        investmentStatus {
          ${CATALOG_ENTRY}
        }
        currency {
          ${CATALOG_ENTRY}
        }
        ownerEmployee {
          id
          displayName
        }
        investmentAccount {
          id
          name
          code
        }
      }
    }
  `;
};