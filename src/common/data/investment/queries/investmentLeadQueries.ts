// Investment Lead Queries - Complete queries without custom fragments
// Using only common fragments: CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE
import { CATALOG_ENTRY, AUDIT_FIELDS, EMPLOYEE } from '@/common/network/graphql/commonFragments';

export interface InvestmentLeadQueryVariables {
  ids?: string[];
  search?: string;
  sensitive?: boolean;
  academicTitleIds?: string[];
  salutationIds?: string[];
  leadStatusIds?: string[];
  leadSourceIds?: string[];
  leadRatingIds?: string[];
  industryClassIds?: string[];
  companySizeIds?: string[];
  ownerEmployeeIds?: string[];
  conversionDateFrom?: string;
  conversionDateTo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  countryIds?: string[];
  companyNames?: string[];
  regions?: string[];
  localities?: string[];
  contactFullNames?: string[]; // stored as "First|Last" and expanded in where
  limit?: number;
  offset?: number;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
}

// Build where condition for Investment Lead queries
export const buildInvestmentLeadWhereCondition = (variables: InvestmentLeadQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';

  // Search across multiple fields (only using fields that exist in the schema)
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim();
    whereClause += `, _or: [
      { firstName: { _ilike: "%${searchTerm}%" } },
      { lastName: { _ilike: "%${searchTerm}%" } },
      { email: { _ilike: "%${searchTerm}%" } },
      { phoneNumber: { _ilike: "%${searchTerm}%" } },
      { position: { _ilike: "%${searchTerm}%" } },
      { companyName: { _ilike: "%${searchTerm}%" } },
      { companyEmail: { _ilike: "%${searchTerm}%" } },
      { companyPhone: { _ilike: "%${searchTerm}%" } },
      { companyWebsite: { _ilike: "%${searchTerm}%" } },
      { code: { _ilike: "%${searchTerm}%" } },
      { description: { _ilike: "%${searchTerm}%" } },
      { investmentName: { _ilike: "%${searchTerm}%" } }
    ]`;
  }

  // Filter by specific fields
  if (variables.academicTitleIds?.length) {
    whereClause += `, academicTitle: { id: { _in: [${variables.academicTitleIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.salutationIds?.length) {
    whereClause += `, salutation: { id: { _in: [${variables.salutationIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.leadStatusIds?.length) {
    whereClause += `, leadStatus: { id: { _in: [${variables.leadStatusIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.leadSourceIds?.length) {
    whereClause += `, leadSource: { id: { _in: [${variables.leadSourceIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.leadRatingIds?.length) {
    whereClause += `, leadRating: { id: { _in: [${variables.leadRatingIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.industryClassIds?.length) {
    whereClause += `, industryClass: { id: { _in: [${variables.industryClassIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.companySizeIds?.length) {
    whereClause += `, companySize: { id: { _in: [${variables.companySizeIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.ownerEmployeeIds?.length) {
    whereClause += `, ownerEmployee: { id: { _in: [${variables.ownerEmployeeIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.conversionDateFrom) {
    whereClause += `, conversionDate: { _gte: "${variables.conversionDateFrom}" }`;
  }

  if (variables.conversionDateTo) {
    whereClause += `, conversionDate: { _lte: "${variables.conversionDateTo}" }`;
  }

  if (variables.createdAtFrom) {
    whereClause += `, createdAt: { _gte: "${variables.createdAtFrom}" }`;
  }

  if (variables.createdAtTo) {
    whereClause += `, createdAt: { _lte: "${variables.createdAtTo}" }`;
  }

  if (variables.countryIds?.length) {
    whereClause += `, country: { id: { _in: [${variables.countryIds.map(id => `"${id}"`).join(', ')}] } }`;
  }

  if (variables.companyNames?.length) {
    whereClause += `, companyName: { _in: [${variables.companyNames.map(n => `"${n.replace(/"/g, '\\"')}"`).join(', ')}] }`;
  }

  if (variables.regions?.length) {
    whereClause += `, region: { value: { _in: [${variables.regions.map(r => `"${r.replace(/"/g, '\\"')}"`).join(', ')}] } }`;
  }

  if (variables.localities?.length) {
    whereClause += `, locality: { _in: [${variables.localities.map(c => `"${c.replace(/"/g, '\\"')}"`).join(', ')}] }`;
  }

  if (variables.contactFullNames?.length) {
    const nameConds = variables.contactFullNames.map(n => {
      const [first, last] = n.split('|');
      const f = (first || '').trim();
      const l = (last || '').trim();
      if (f && l) {
        return `{ _and: [ { firstName: { _ilike: "%${f}%" } }, { lastName: { _ilike: "%${l}%" } } ] }`;
      }
      if (f) return `{ firstName: { _ilike: "%${f}%" } }`;
      if (l) return `{ lastName: { _ilike: "%${l}%" } }`;
      return '';
    }).filter(Boolean);
    if (nameConds.length) {
      whereClause += `, _or: [${nameConds.join(', ')}]`;
    }
  }

  // Boolean filter for sensitivity
  if (typeof variables.sensitive === 'boolean') {
    whereClause += `, sensitive: { _eq: ${variables.sensitive} }`;
  }

  whereClause += ' }';
  return whereClause;
};

// Get Investment Leads with full details
export const GET_INVESTMENT_LEADS = (variables: InvestmentLeadQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildInvestmentLeadWhereCondition(variables);

  const orderByClause = variables.orderBy?.length
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ createdAt: DESC }]';

  return `
    query GetInvestmentLeads {
      InvestmentLead(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        id
        code
        firstName
        lastName
        sensitive
        email
        phoneNumber
        position
        companyName
        companyEmail
        companyPhone
        companyWebsite
        description
        conversionDate
        annualNetColdRent
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        academicTitle {
          ${CATALOG_ENTRY}
        }
        salutation {
          ${CATALOG_ENTRY}
        }
        leadRating {
          ${CATALOG_ENTRY}
        }
        leadStatus {
          ${CATALOG_ENTRY}
        }
        leadSource {
          ${CATALOG_ENTRY}
        }
        industryClass {
          ${CATALOG_ENTRY}
        }
        companySize {
          ${CATALOG_ENTRY}
        }
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE}
        }
        
        # Entity relationships
        convertedAccount {
          id
          code
          name
          email
          geographicPresence
        }
        convertedContact {
          id
          code
          firstName
          lastName
          email
        }
      }
      
      InvestmentLeadAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `;
};

// Get Investment Lead by ID
export const GET_INVESTMENT_LEAD_BY_ID = (id: string): string => {
  return `
    query GetInvestmentLeadById {
      InvestmentLead(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        id
        code
        firstName
        lastName
        sensitive
        email
        
        companyName
        companyEmail
        companyPhone
        companyWebsite
        
        description
        
        
        conversionDate
        
        
        annualNetColdRent
        ${AUDIT_FIELDS}
        
        # Catalog relationships
        academicTitle {
          ${CATALOG_ENTRY}
        }
        salutation {
          ${CATALOG_ENTRY}
        }
        
        leadStatus {
          ${CATALOG_ENTRY}
        }
        leadSource {
          ${CATALOG_ENTRY}
        }
        industryClass {
          ${CATALOG_ENTRY}
        }
        companySize {
          ${CATALOG_ENTRY}
        }
        
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE}
        }
        
        # Entity relationships
        convertedAccount {
          id
          code
          name
          email
          geographicPresence
          industryClass {
            ${CATALOG_ENTRY}
          }
        }
        convertedContact {
          id
          code
          firstName
          lastName
          email
        }
      }
    }
  `;
};

// Search Investment Leads (lightweight for autocomplete)
export const SEARCH_INVESTMENT_LEADS = (variables: InvestmentLeadQueryVariables): string => {
  const { search = '', limit = 10 } = variables;

  return `
    query SearchInvestmentLeads {
      InvestmentLead(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { firstName: { _ilike: "%${search}%" } },
                { lastName: { _ilike: "%${search}%" } },
                { email: { _ilike: "%${search}%" } },
                { companyName: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } }
              ]
            }
          ]
        }
        limit: ${limit}
        orderBy: [{ firstName: ASC }]
      ) {
        id
        code
        firstName
        lastName
        sensitive
        email
        companyName
        leadStatus {
          id
          code
          value
        }
        leadSource {
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
// INVESTMENT LEAD RELATED ENTITIES QUERIES
// =====================================================

// Get Investment Tasks by Lead ID
export const GET_INVESTMENT_TASKS_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetInvestmentTasksByLeadId {
      InvestmentTask(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
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
        lead {
          id
          code
          firstName
          lastName
        }
      }
    }
  `;
};

// Get Investment Activities by Lead ID
export const GET_INVESTMENT_ACTIVITIES_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetInvestmentActivitiesByLeadId {
      InvestmentActivity(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ occurredAt: DESC }]
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
        lead {
          id
          code
          firstName
          lastName
        }
      }
    }
  `;
};

// Get Investment Notes by Lead ID
export const GET_INVESTMENT_NOTES_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetInvestmentNotesByLeadId {
      InvestmentNote(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
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
        lead {
          id
          code
          firstName
          lastName
        }
      }
    }
  `;
};

// Get Investment Documents by Lead ID
export const GET_INVESTMENT_DOCUMENTS_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetInvestmentDocumentsByLeadId {
      InvestmentDocument(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
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
        folder
        ${AUDIT_FIELDS}
        
        # Catalog references
        documentGroup {
          ${CATALOG_ENTRY}
        }
        documentType {
          ${CATALOG_ENTRY}
        }
        
        # Entity references
        parentDocument {
          id
          name
          description
        }
        lead {
          id
          code
          firstName
          lastName
        }
      }
    }
  `;
};