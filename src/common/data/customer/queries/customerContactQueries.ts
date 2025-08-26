// Customer Contact Queries - using shared fragments
import { CUSTOMER_CONTACT, CUSTOMER_ACCOUNT_REF } from './fragments/customerRelationFragments';

export interface CustomerContactQueryVariables {
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
  createdAtFrom?: string;
  createdAtTo?: string;
  birthDateFrom?: string;
  birthDateTo?: string;
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

export const buildCustomerContactWhereCondition = (variables: CustomerContactQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';

  if (variables.search?.trim()) {
    const q = variables.search.trim();
    whereClause += `, _or: [
      { firstName: { _ilike: "%${q}%" } },
      { lastName: { _ilike: "%${q}%" } },
      { fullName: { _ilike: "%${q}%" } },
      { email: { _ilike: "%${q}%" } },
      { phone: { _ilike: "%${q}%" } },
      { code: { _ilike: "%${q}%" } },
      { department: { _ilike: "%${q}%" } },
      { description: { _ilike: "%${q}%" } },
      { jobPosition: { _ilike: "%${q}%" } }
    ]`;
  }

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
    whereClause += `, account: { id: { _in: [${variables.accountIds.map(id => `"${id}"`).join(', ')}] } }`;
  }
  if (variables.contactTypes?.length) {
    whereClause += `, contactType: { _in: [${variables.contactTypes.map(v => `"${v}"`).join(', ')}] }`;
  }
  if (variables.departments?.length) {
    whereClause += `, department: { _in: [${variables.departments.map(v => `"${v}"`).join(', ')}] }`;
  }
  if (variables.fullNames?.length) {
    whereClause += `, fullName: { _in: [${variables.fullNames.map(v => `"${v}"`).join(', ')}] }`;
  }

  if (variables.createdAtFrom) whereClause += `, createdAt: { _gte: "${variables.createdAtFrom}" }`;
  if (variables.createdAtTo) whereClause += `, createdAt: { _lte: "${variables.createdAtTo}" }`;
  if (variables.birthDateFrom) whereClause += `, birthDate: { _gte: "${variables.birthDateFrom}" }`;
  if (variables.birthDateTo) whereClause += `, birthDate: { _lte: "${variables.birthDateTo}" }`;

  if (variables.hasEmail) whereClause += `, email: { _isNull: false, _neq: "" }`;
  if (variables.missingEmail) whereClause += `, _or: [ { email: { _isNull: true } }, { email: { _eq: "" } } ]`;
  if (variables.hasPhone) whereClause += `, phone: { _isNull: false, _neq: "" }`;
  if (variables.missingPhone) whereClause += `, _or: [ { phone: { _isNull: true } }, { phone: { _eq: "" } } ]`;

  whereClause += ' }';
  return whereClause;
};

export const GET_CUSTOMER_CONTACTS = (variables: CustomerContactQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildCustomerContactWhereCondition(variables);
  const orderByClause = variables.orderBy?.length 
    ? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
    : 'orderBy: [{ fullName: ASC }]';

  return `
    query GetCustomerContacts {
      CustomerContact: Contact(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_CONTACT}
      }
      CustomerContactAggregate: ContactAggregate(${where}) { aggregate { count } }
    }
  `;
};

export const GET_CUSTOMER_CONTACT_BY_ID = (id: string): string => {
  return `
    query GetCustomerContactById {
      CustomerContact: Contact(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${CUSTOMER_CONTACT}
        account { ${CUSTOMER_ACCOUNT_REF} }
      }
    }
  `;
};

export const SEARCH_CUSTOMER_CONTACTS = (variables: CustomerContactQueryVariables): string => {
  const { search = '', limit = 10 } = variables;
  return `
    query SearchCustomerContacts {
      CustomerContact: Contact(
        where: {
          isDeleted: { _eq: false }
          _and: [ { _or: [
            { firstName: { _ilike: "%${search}%" } },
            { lastName: { _ilike: "%${search}%" } },
            { fullName: { _ilike: "%${search}%" } },
            { email: { _ilike: "%${search}%" } },
            { code: { _ilike: "%${search}%" } }
          ] } ]
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
      }
    }
  `;
};


