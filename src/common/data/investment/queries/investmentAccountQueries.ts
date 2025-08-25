// Investment Account Queries - Complete queries without custom fragments
// Using only common fragments: CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE
import { CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE } from '@/common/network/graphql/commonFragments';

export interface InvestmentAccountQueryVariables {
  ids?: string[];
  search?: string;
  industryClassIds?: string[];
  companySizeIds?: string[];
  legalFormIds?: string[];
  accountAnnualRevenueBandIds?: string[];
  ownerEmployeeIds?: string[];
  names?: string[];
  geographicPresenceValues?: string[];
  // Created timestamps
  createdAtFrom?: string;
  createdAtTo?: string;
  foundationDateFrom?: string;
  foundationDateTo?: string;
  // Contact info presence filters
  hasWebsite?: boolean;
  missingWebsite?: boolean;
  hasEmail?: boolean;
  missingEmail?: boolean;
  hasPhone?: boolean;
  missingPhone?: boolean;
  hasContact?: boolean;
  missingContact?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
}

// Build where condition for Investment Account queries
export const buildInvestmentAccountWhereCondition = (variables: InvestmentAccountQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';

  const andConditions: string[] = [];
  const orConditions: string[] = [];

  // Search across multiple fields
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim();
    orConditions.push(
      `{ name: { _ilike: "%${searchTerm}%" } }`,
      `{ code: { _ilike: "%${searchTerm}%" } }`,
      `{ email: { _ilike: "%${searchTerm}%" } }`,
      `{ phone: { _ilike: "%${searchTerm}%" } }`,
      `{ geographicPresence: { _ilike: "%${searchTerm}%" } }`,
      `{ specialty: { _ilike: "%${searchTerm}%" } }`,
      `{ mission: { _ilike: "%${searchTerm}%" } }`
    );
  }

  // Filter by specific fields
  if (variables.industryClassIds?.length) {
    andConditions.push(`{ industryClass: { id: { _in: [${variables.industryClassIds.map(id => `"${id}"`).join(', ')}] } } }`);
  }

  if (variables.companySizeIds?.length) {
    andConditions.push(`{ companySize: { id: { _in: [${variables.companySizeIds.map(id => `"${id}"`).join(', ')}] } } }`);
  }

  if (variables.legalFormIds?.length) {
    andConditions.push(`{ legalForm: { id: { _in: [${variables.legalFormIds.map(id => `"${id}"`).join(', ')}] } } }`);
  }

  if (variables.accountAnnualRevenueBandIds?.length) {
    andConditions.push(`{ accountAnnualRevenueBand: { id: { _in: [${variables.accountAnnualRevenueBandIds.map(id => `"${id}"`).join(', ')}] } } }`);
  }

  if (variables.ownerEmployeeIds?.length) {
    andConditions.push(`{ ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } } }`);
  }

  if (variables.names?.length) {
    andConditions.push(`{ name: { _in: [${variables.names.map(n => `"${n}"`).join(', ')}] } }`);
  }

  if (variables.geographicPresenceValues?.length) {
    andConditions.push(`{ geographicPresence: { _in: [${variables.geographicPresenceValues.map(v => `"${v}"`).join(', ')}] } }`);
  }

  // CreatedAt range
  if (variables.createdAtFrom || variables.createdAtTo) {
    const parts: string[] = [];
    if (variables.createdAtFrom) parts.push(`_gte: "${variables.createdAtFrom}"`);
    if (variables.createdAtTo) parts.push(`_lte: "${variables.createdAtTo}"`);
    andConditions.push(`{ createdAt: { ${parts.join(', ')} } }`);
  }

  // Foundation date range
  if (variables.foundationDateFrom || variables.foundationDateTo) {
    const parts: string[] = [];
    if (variables.foundationDateFrom) parts.push(`_gte: "${variables.foundationDateFrom}"`);
    if (variables.foundationDateTo) parts.push(`_lte: "${variables.foundationDateTo}"`);
    andConditions.push(`{ foundationDate: { ${parts.join(', ')} } }`);
  }

  // Contact info presence
  if (variables.hasWebsite) {
    andConditions.push(`{ website: { _isNull: false, _neq: "" } }`);
  }
  if (variables.missingWebsite) {
    andConditions.push(`{ _or: [ { website: { _isNull: true } }, { website: { _eq: "" } } ] }`);
  }
  if (variables.hasEmail) {
    andConditions.push(`{ email: { _isNull: false, _neq: "" } }`);
  }
  if (variables.missingEmail) {
    andConditions.push(`{ _or: [ { email: { _isNull: true } }, { email: { _eq: "" } } ] }`);
  }
  if (variables.hasPhone) {
    andConditions.push(`{ phone: { _isNull: false, _neq: "" } }`);
  }
  if (variables.missingPhone) {
    andConditions.push(`{ _or: [ { phone: { _isNull: true } }, { phone: { _eq: "" } } ] }`);
  }
  if (variables.hasContact) {
    andConditions.push(`{ investmentAccountContact: { id: { _isNull: false } } }`);
  }
  if (variables.missingContact) {
    andConditions.push(`{ _not: { investmentAccountContact: { id: { _isNull: false } } } }`);
  }

  if (orConditions.length) {
    whereClause += `, _or: [${orConditions.join(', ')}]`;
  }
  if (andConditions.length) {
    whereClause += `, _and: [${andConditions.join(', ')}]`;
  }

  whereClause += ' }';
  return whereClause;
};

// Get Investment Accounts with full details
export const GET_INVESTMENT_ACCOUNTS = (variables: InvestmentAccountQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildInvestmentAccountWhereCondition(variables);
  
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ name: ASC }]';

  return `
    query GetInvestmentAccounts {
      InvestmentAccount(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        id
        code
        name
        email
        phone
        foundationDate
        geographicPresence
        specialty
        mission
        liquidationDate
        website
        picture
        pictureThumbnail
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        legalForm {
          ${CATALOG_ENTRY}
        }
        accountAnnualRevenueBand {
          ${CATALOG_ENTRY}
        }
        companySize {
          ${CATALOG_ENTRY}
        }
        industryClass {
          ${CATALOG_ENTRY}
        }
        
        
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE}
        }
        
        # Aggregate counts for relationships
        investmentAggregate {
          aggregate {
            count
          }
        }
        investmentAccountContactAggregate {
          aggregate {
            count
          }
        }
        investmentLeadAggregate {
          aggregate {
            count
          }
        }
        investmentOpportunityAggregate {
          aggregate {
            count
          }
        }
      }
      
      InvestmentAccountAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `;
};

// Get Investment Account by ID
export const GET_INVESTMENT_ACCOUNT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentAccountById {
      InvestmentAccount(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        id
        code
        name
        email
        foundationDate
        geographicPresence
        specialty
        mission
        liquidationDate
        website
        picture
        pictureThumbnail
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        legalForm {
          ${CATALOG_ENTRY}
        }
        accountAnnualRevenueBand {
          ${CATALOG_ENTRY}
        }
        companySize {
          ${CATALOG_ENTRY}
        }
        industryClass {
          ${CATALOG_ENTRY}
        }
        
        
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE}
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
          
          # Basic investment info
          investmentType {
            ${CATALOG_ENTRY}
          }
          currency {
            ${CATALOG_ENTRY}
          }
        }
        
        # Related contacts
        investmentAccountContact {
          id
          contactType
          contact {
            id
            code
            firstName
            lastName
            fullName
            email
            phone
            jobPosition
          }
        }
      }
    }
  `;
};

// Search Investment Accounts (lightweight for autocomplete)
export const SEARCH_INVESTMENT_ACCOUNTS = (variables: InvestmentAccountQueryVariables): string => {
  const { search = '', limit = 10 } = variables;
  
  return `
    query SearchInvestmentAccounts {
      InvestmentAccount(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { name: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } },
                { email: { _ilike: "%${search}%" } },
                { geographicPresence: { _ilike: "%${search}%" } }
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
        email
        geographicPresence
        industryClass {
          id
          code
          value
        }
        companySize {
          id
          code
          value
        }
        ownerEmployee {
          id
          displayName
        }
      }
    }
  `;
};

// =====================================================
// INVESTMENT ACCOUNT RELATED ENTITIES QUERIES
// =====================================================

// Get Investment Tasks by Account ID
export const GET_INVESTMENT_TASKS_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetInvestmentTasksByAccountId {
      InvestmentTask(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        code
        name
        description
        comment
        startDate
        dueDate
        endDate
        taskTiming
        ${AUDIT_FIELDS}
        
        # Catalog references
        taskType {
          ${CATALOG_ENTRY}
        }
        taskPriority {
          ${CATALOG_ENTRY}
        }
        taskStatus {
          ${CATALOG_ENTRY}
        }
        
        # Employee references
        creatorEmployee {
          ${EMPLOYEE}
        }
        assignedEmployee {
          ${EMPLOYEE}
        }
        
        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Activities by Account ID
export const GET_INVESTMENT_ACTIVITIES_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetInvestmentActivitiesByAccountId {
      InvestmentActivity(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        title
        description
        occurredAt
        completedAt
        ${AUDIT_FIELDS}
        
        # Catalog references
        activityType {
          ${CATALOG_ENTRY}
        }
        
        # Employee references
        ownerEmployee {
          ${EMPLOYEE}
        }
        
        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Notes by Account ID
export const GET_INVESTMENT_NOTES_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetInvestmentNotesByAccountId {
      InvestmentNote(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        title
        text
        reminderDate
        ${AUDIT_FIELDS}
        
        # Employee references
        authorEmployee {
          ${EMPLOYEE}
        }
        
        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `;
};

// Get Investment Documents by Account ID
export const GET_INVESTMENT_DOCUMENTS_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetInvestmentDocumentsByAccountId {
      InvestmentDocument(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        name
        description
        file
        fileSize
        mimeType
        verified
        verificationDate
        authenticated
        authenticationDate
        mandatory
        expirationDate
        ${AUDIT_FIELDS}
        
        # Catalog references
        documentGroup {
          ${CATALOG_ENTRY}
        }
        documentType {
          ${CATALOG_ENTRY}
        }
        
        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `;
};