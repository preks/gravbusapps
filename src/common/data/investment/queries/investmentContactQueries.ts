// Investment Contact Queries - Complete queries without custom fragments
// Using only common fragments: CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE
import { CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE } from '@/common/network/graphql/commonFragments';

export interface InvestmentContactQueryVariables {
  ids?: string[];
  search?: string;
  academicTitleIds?: string[];
  salutationIds?: string[];
  languageIds?: string[];
  ownerEmployeeIds?: string[];
  accountIds?: string[];
  contactTypes?: string[];
  departments?: string[];
  fullNames?: string[];
  // Created timestamps
  createdAtFrom?: string;
  createdAtTo?: string;
  birthDateFrom?: string;
  birthDateTo?: string;
  // Contact info presence filters
  hasEmail?: boolean;
  missingEmail?: boolean;
  hasPhone?: boolean;
  missingPhone?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
}

// Build where condition for Investment Contact queries
export const buildInvestmentContactWhereCondition = (variables: InvestmentContactQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';
  
  // Search across multiple fields (only using fields that exist in the schema)
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim();
    whereClause += `, _or: [
      { firstName: { _ilike: "%${searchTerm}%" } },
      { lastName: { _ilike: "%${searchTerm}%" } },
      { fullName: { _ilike: "%${searchTerm}%" } },
      { email: { _ilike: "%${searchTerm}%" } },
      { phone: { _ilike: "%${searchTerm}%" } },
      { code: { _ilike: "%${searchTerm}%" } },
      { department: { _ilike: "%${searchTerm}%" } },
      { description: { _ilike: "%${searchTerm}%" } },
      { jobPosition: { _ilike: "%${searchTerm}%" } }
    ]`;
  }

  // Filter by specific fields
  if (variables.academicTitleIds?.length) {
    whereClause += `, academicTitle: { id: { _in: [${variables.academicTitleIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.salutationIds?.length) {
    whereClause += `, salutation: { id: { _in: [${variables.salutationIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.languageIds?.length) {
    whereClause += `, language: { id: { _in: [${variables.languageIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.ownerEmployeeIds?.length) {
    whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.accountIds?.length) {
    whereClause += `, investmentAccountContact: { account: { id: { _in: [${variables.accountIds.map(id => `"${id}"`).join(', ')}] } } }`;
  }

  if (variables.contactTypes?.length) {
    whereClause += `, type: { _in: [${variables.contactTypes.map(v => `"${v}"`).join(', ')}] }`;
  }

  if (variables.departments?.length) {
    whereClause += `, department: { _in: [${variables.departments.map(v => `"${v}"`).join(', ')}] }`;
  }

  if (variables.fullNames?.length) {
    whereClause += `, fullName: { _in: [${variables.fullNames.map(v => `"${v}"`).join(', ')}] }`;
  }

  // CreatedAt range
  if (variables.createdAtFrom) {
    whereClause += `, createdAt: { _gte: "${variables.createdAtFrom}" }`;
  }
  if (variables.createdAtTo) {
    whereClause += `, createdAt: { _lte: "${variables.createdAtTo}" }`;
  }

  if (variables.birthDateFrom) {
    whereClause += `, birthDate: { _gte: "${variables.birthDateFrom}" }`;
  }

  if (variables.birthDateTo) {
    whereClause += `, birthDate: { _lte: "${variables.birthDateTo}" }`;
  }

  // Contact info presence
  if (variables.hasEmail) {
    whereClause += `, email: { _isNull: false, _neq: "" }`;
  }
  if (variables.missingEmail) {
    whereClause += `, _or: [ { email: { _isNull: true } }, { email: { _eq: "" } } ]`;
  }
  if (variables.hasPhone) {
    whereClause += `, phone: { _isNull: false, _neq: "" }`;
  }
  if (variables.missingPhone) {
    whereClause += `, _or: [ { phone: { _isNull: true } }, { phone: { _eq: "" } } ]`;
  }

  whereClause += ' }';
  return whereClause;
};

// Get Investment Contacts with full details
export const GET_INVESTMENT_CONTACTS = (variables: InvestmentContactQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildInvestmentContactWhereCondition(variables);
  
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ fullName: ASC }]';

  return `
    query GetInvestmentContacts {
      InvestmentContact(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        id
        code
        firstName
        lastName
        fullName
        email
        phone
        
        birthDate
        department
        description
        jobPosition
        picture
        pictureThumbnail
        
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        academicTitle {
          ${CATALOG_ENTRY}
        }
        salutation {
          ${CATALOG_ENTRY}
        }
        language {
          ${CATALOG_ENTRY}
        }
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE}
        }
        
        # Aggregate counts for relationships
        investmentAccountContactAggregate {
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
      
      InvestmentContactAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `;
};

// Get Investment Contact by ID
export const GET_INVESTMENT_CONTACT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentContactById {
      InvestmentContact(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        id
        code
        firstName
        lastName
        fullName
        email
        phone
        
        birthDate
        department
        description
        jobPosition
        picture
        pictureThumbnail
        
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        academicTitle {
          ${CATALOG_ENTRY}
        }
        salutation {
          ${CATALOG_ENTRY}
        }
        language {
          ${CATALOG_ENTRY}
        }
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE}
        }
        
        # Related accounts through account-contact relationships
        investmentAccountContact {
          id
          contactType
          account {
            id
            code
            name
            email
            geographicPresence
            industryClass {
              ${CATALOG_ENTRY}
            }
          }
        }
      }
    }
  `;
};

// Search Investment Contacts (lightweight for autocomplete)
export const SEARCH_INVESTMENT_CONTACTS = (variables: InvestmentContactQueryVariables): string => {
  const { search = '', limit = 10 } = variables;
  
  return `
    query SearchInvestmentContacts {
      InvestmentContact(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { firstName: { _ilike: "%${search}%" } },
                { lastName: { _ilike: "%${search}%" } },
                { fullName: { _ilike: "%${search}%" } },
                { email: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } }
              ]
            }
          ]
        }
        limit: ${limit}
        orderBy: [{ fullName: ASC }]
      ) {
        id
        code
        firstName
        lastName
        fullName
        email
        phone
        jobPosition
        department
        academicTitle {
          id
          code
          value
        }
        salutation {
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