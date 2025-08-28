// Customer Task Queries - generic task list queries for customer relations
import { CUSTOMER_TASK, CUSTOMER_ACCOUNT_REF, CUSTOMER_CONTACT_REF, CUSTOMER_OPPORTUNITY_REF, CUSTOMER_LEAD_REF } from './fragments/customerRelationFragments';
import { buildOrderBy, buildSearch, buildFilter, type Descriptor } from '@/common/network/graphql/queryHelpers';

// Unified descriptors for Sales Task (search, sort, filters, and option metadata)
export const CUSTOMER_TASK_DESCRIPTORS: Descriptor[] = [
  // Search/sort
  { key: 'name', searchPaths: ['name', 'code', 'description'], sortPath: 'name', type: 'text' },
  { key: 'taskType', searchPaths: ['typeRef'], sortPath: 'typeRef', type: 'text' },
  { key: 'taskPriority', searchPaths: ['priorityRef'], sortPath: 'priorityRef', type: 'text' },
  { key: 'taskStatus', searchPaths: ['statusRef'], sortPath: 'statusRef', type: 'text' },
  { key: 'assignedEmployee', searchPaths: ['assignedEmployee.displayName', 'assignedEmployee.firstName', 'assignedEmployee.lastName'], sortPath: 'assignedEmployee.displayName', type: 'text' },
  { key: 'creatorEmployee', searchPaths: ['creatorEmployee.displayName', 'creatorEmployee.firstName', 'creatorEmployee.lastName'], sortPath: 'creatorEmployee.displayName', type: 'text' },
  { key: 'dueDate', searchPaths: ['dueDate'], type: 'date' },
  { key: 'startDate', searchPaths: ['startDate'], type: 'date' },
  { key: 'endDate', searchPaths: ['endDate'], type: 'date' },
  { key: 'createdAt', searchPaths: ['createdAt'], type: 'date' },

  // Filters (IDs, strings, booleans, dates, custom)
  { key: 'taskTypeIds', path: 'typeRef', kind: 'inStrings' },
  { key: 'taskPriorityIds', path: 'priorityRef', kind: 'inStrings' },
  { key: 'taskStatusIds', path: 'statusRef', kind: 'inStrings' },
  { key: 'assignedEmployeeIds', path: 'assignedEmployee.id', kind: 'inIds' },
  { key: 'creatorEmployeeIds', path: 'creatorEmployee.id', kind: 'inIds' },
  { key: 'timingTypes', path: 'taskTiming', kind: 'inStrings' },

  // Relation filters
  { key: 'accountIds', path: 'account.id', kind: 'inIds' },
  { key: 'contactIds', path: 'contact.id', kind: 'inIds' },
  { key: 'leadIds', path: 'lead.id', kind: 'inIds' },
  { key: 'opportunityIds', path: 'opportunity.id', kind: 'inIds' },

  // Date range filters
  { key: 'dueDateFrom', path: 'dueDate', kind: 'dateFrom' },
  { key: 'dueDateTo', path: 'dueDate', kind: 'dateTo' },
  { key: 'startDateFrom', path: 'startDate', kind: 'dateFrom' },
  { key: 'startDateTo', path: 'startDate', kind: 'dateTo' },
  { key: 'endDateFrom', path: 'endDate', kind: 'dateFrom' },
  { key: 'endDateTo', path: 'endDate', kind: 'dateTo' }
];

export interface CustomerTaskQueryVariables {
  search?: string;
  taskTypeIds?: string[];
  taskPriorityIds?: string[];
  taskStatusIds?: string[];
  assignedEmployeeIds?: string[];
  creatorEmployeeIds?: string[];
  timingTypes?: string[];

  accountIds?: string[];
  contactIds?: string[];
  leadIds?: string[];
  opportunityIds?: string[];

  dueDateFrom?: string;
  dueDateTo?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;

  limit?: number;
  offset?: number;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
}

// Build where condition for Customer Task queries
export const buildCustomerTaskWhereCondition = (variables: CustomerTaskQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }';

  // Generic search across dot-paths from descriptors
  const searchOr = buildSearch(variables.search || '', CUSTOMER_TASK_DESCRIPTORS);
  if (searchOr) whereClause += `, ${searchOr}`;

  // Generic AND filters from descriptors
  const andFilters = buildFilter(variables as any, CUSTOMER_TASK_DESCRIPTORS);
  if (andFilters) whereClause += `, ${andFilters}`;

  whereClause += ' }';
  return whereClause;
};

// Get Customer Tasks with full details and aggregate count
export const GET_CUSTOMER_TASKS = (variables: CustomerTaskQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100);
  const offset = variables.offset || 0;
  const where = buildCustomerTaskWhereCondition(variables);

  const orderByBuilt = buildOrderBy(variables.orderBy || [], CUSTOMER_TASK_DESCRIPTORS);
  const orderByClause = orderByBuilt || 'orderBy: [{ createdAt: DESC }]';

  return `
    query GetCustomerTasks {
      SalesTask(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_TASK}

        # Entity references (minimal for display)
        account { ${CUSTOMER_ACCOUNT_REF} }
        contact { ${CUSTOMER_CONTACT_REF} }
        lead { ${CUSTOMER_LEAD_REF} }
        opportunity { ${CUSTOMER_OPPORTUNITY_REF} }
      }

      SalesTaskAggregate(${where}) {
        aggregate { count }
      }
    }
  `;
};

// Get Customer Tasks by Account ID
export const GET_CUSTOMER_TASKS_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetCustomerTasksByAccountId {
      SalesTask(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_TASK}

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

// Get Customer Tasks by Contact ID
export const GET_CUSTOMER_TASKS_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetCustomerTasksByContactId {
      SalesTask(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_TASK}

        # Entity references
        contact {
          id
          code
          firstName
          lastName
        }
      }
    }
  `;
};

// Get Customer Tasks by Lead ID
export const GET_CUSTOMER_TASKS_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetCustomerTasksByLeadId {
      SalesTask(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_TASK}

        # Entity references
        lead {
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

// Get Customer Tasks by Opportunity ID
export const GET_CUSTOMER_TASKS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetCustomerTasksByOpportunityId {
      SalesTask(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_TASK}

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
