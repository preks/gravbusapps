import { SalesTaskQueryVariables } from '../types/SalesTaskTypes';

/**
 * Builds search condition for GraphQL where clause
 */
export const buildSearchCondition = (search?: string): any => {
  if (!search?.trim()) return null;
  
  const searchPattern = `%${search.trim()}%`;
  return {
    _or: [
      { name: { _ilike: searchPattern } },
      { description: { _ilike: searchPattern } },
      { account: { name: { _ilike: searchPattern } } },
      { contact: { firstName: { _ilike: searchPattern } } },
      { contact: { lastName: { _ilike: searchPattern } } },
      { lead: { firstName: { _ilike: searchPattern } } },
      { lead: { lastName: { _ilike: searchPattern } } },
      { lead: { companyName: { _ilike: searchPattern } } },
      { opportunity: { name: { _ilike: searchPattern } } },
      { assignedEmployee: { firstName: { _ilike: searchPattern } } },
      { assignedEmployee: { lastName: { _ilike: searchPattern } } },
      { assignedEmployee: { displayName: { _ilike: searchPattern } } }
    ]
  };
};

/**
 * Builds filter conditions for GraphQL where clause
 */
export const buildFilterConditions = (variables: SalesTaskQueryVariables): any => {
  const conditions: any = {
    recordState: { _neq: "DELETED" }
  };

  if (variables.taskTypes?.length) {
    conditions.typeRef = { _in: variables.taskTypes };
  }

  if (variables.statusRefs?.length) {
    conditions.statusRef = { _in: variables.statusRefs };
  }

  if (variables.priorityRefs?.length) {
    conditions.priorityRef = { _in: variables.priorityRefs };
  }

  if (variables.assignedEmployeeIds?.length) {
    conditions.assignedEmployeeId = { _in: variables.assignedEmployeeIds };
  }

  if (variables.accountIds?.length) {
    conditions.accountId = { _in: variables.accountIds };
  }

  if (variables.leadIds?.length) {
    conditions.leadId = { _in: variables.leadIds };
  }

  if (variables.opportunityIds?.length) {
    conditions.opportunityId = { _in: variables.opportunityIds };
  }

  if (variables.contactIds?.length) {
    conditions.contactId = { _in: variables.contactIds };
  }

  if (variables.createdAfter) {
    conditions.createdAt = { ...conditions.createdAt, _gte: variables.createdAfter };
  }

  if (variables.createdBefore) {
    conditions.createdAt = { ...conditions.createdAt, _lte: variables.createdBefore };
  }

  if (variables.dueDateAfter) {
    conditions.dueDate = { ...conditions.dueDate, _gte: variables.dueDateAfter };
  }

  if (variables.dueDateBefore) {
    conditions.dueDate = { ...conditions.dueDate, _lte: variables.dueDateBefore };
  }

  return conditions;
};

/**
 * Builds complete where clause for GraphQL query
 */
export const buildWhereClause = (variables: SalesTaskQueryVariables): any => {
  const { search, where } = variables;
  
  const filterConditions = buildFilterConditions(variables);
  const searchCondition = buildSearchCondition(search);
  
  let finalWhere = { ...filterConditions };
  
  if (searchCondition) {
    finalWhere = { _and: [filterConditions, searchCondition] };
  }
  
  if (where) {
    finalWhere = { _and: [finalWhere, where] };
  }

  return finalWhere;
};

/**
 * Builds orderBy clause for GraphQL query with proper syntax
 */
export const buildOrderByClause = (orderBy?: any[]): any[] => {
  const defaultOrderBy = [{ createdAt: "DESC" }];
  
  if (!orderBy || !Array.isArray(orderBy) || orderBy.length === 0) {
    return defaultOrderBy;
  }
  
  return orderBy.map(item => {
    const field = Object.keys(item)[0];
    const direction = item[field];
    
    // Handle nested object fields that require sub-field specification
    if (typeof direction === 'object' && direction !== null) {
      return { [field]: direction };
    }
    
    // Handle known nested fields with sensible defaults
    switch (field) {
      case 'assignedEmployee':
        return { assignedEmployee: { firstName: direction } };
      case 'account':
        return { account: { name: direction } };
      case 'contact':
        return { contact: { firstName: direction } };
      case 'lead':
        return { lead: { firstName: direction } };
      case 'opportunity':
        return { opportunity: { name: direction } };
      default:
        return { [field]: direction };
    }
  });
};

/**
 * Builds complete arguments for GraphQL query
 */
export const buildQueryArguments = (
  variables: SalesTaskQueryVariables,
  includeOrderBy: boolean = true
): any => {
  const { offset = 0, limit = 20, orderBy } = variables;
  
  const args: any = {
    limit,
    offset
  };
  
  const whereClause = buildWhereClause(variables);
  if (whereClause && Object.keys(whereClause).length > 0) {
    args.where = whereClause;
  }
  
  if (includeOrderBy) {
    args.orderBy = buildOrderByClause(orderBy);
  }
  
  return args;
};

/**
 * Builds arguments for count queries (simpler, higher limit)
 */
export const buildCountQueryArguments = (variables: SalesTaskQueryVariables): any => {
  const args: any = {
    limit: 10000
  };
  
  const whereClause = buildWhereClause(variables);
  if (whereClause && Object.keys(whereClause).length > 0) {
    args.where = whereClause;
  }
  
  return args;
}; 