import { SalesTaskQueryVariables } from '../types/SalesTaskTypes';

/**
 * Builds search condition for GraphQL where clause
 */
export const buildSearchCondition = (search?: string): string => {
  if (!search?.trim()) return '';
  
  const searchPattern = `%${search.trim()}%`;
  return `
    _or: [
      { name: { _ilike: "${searchPattern}" } }
      { description: { _ilike: "${searchPattern}" } }
      { account: { name: { _ilike: "${searchPattern}" } } }
      { contact: { firstName: { _ilike: "${searchPattern}" } } }
      { contact: { lastName: { _ilike: "${searchPattern}" } } }
      { lead: { firstName: { _ilike: "${searchPattern}" } } }
      { lead: { lastName: { _ilike: "${searchPattern}" } } }
      { lead: { companyName: { _ilike: "${searchPattern}" } } }
      { opportunity: { name: { _ilike: "${searchPattern}" } } }
      { assignedEmployee: { firstName: { _ilike: "${searchPattern}" } } }
      { assignedEmployee: { lastName: { _ilike: "${searchPattern}" } } }
      { assignedEmployee: { displayName: { _ilike: "${searchPattern}" } } }
    ]
  `;
};

/**
 * Builds filter conditions array for GraphQL where clause
 */
export const buildFilterConditions = (variables: SalesTaskQueryVariables): string[] => {
  const filterConditions: string[] = [];
  
  // Always exclude deleted records
  filterConditions.push('recordState: { _neq: "DELETED" }');

  if (variables.taskTypes?.length) {
    const types = variables.taskTypes.map(type => `"${type}"`).join(', ');
    filterConditions.push(`typeRef: { _in: [${types}] }`);
  }

  if (variables.statusRefs?.length) {
    const statuses = variables.statusRefs.map(status => `"${status}"`).join(', ');
    filterConditions.push(`statusRef: { _in: [${statuses}] }`);
  }

  if (variables.priorityRefs?.length) {
    const priorities = variables.priorityRefs.map(priority => `"${priority}"`).join(', ');
    filterConditions.push(`priorityRef: { _in: [${priorities}] }`);
  }

  if (variables.assignedEmployeeIds?.length) {
    const employees = variables.assignedEmployeeIds.map(id => `"${id}"`).join(', ');
    filterConditions.push(`assignedEmployeeId: { _in: [${employees}] }`);
  }

  if (variables.accountIds?.length) {
    const accounts = variables.accountIds.map(id => `"${id}"`).join(', ');
    filterConditions.push(`accountId: { _in: [${accounts}] }`);
  }

  if (variables.leadIds?.length) {
    const leads = variables.leadIds.map(id => `"${id}"`).join(', ');
    filterConditions.push(`leadId: { _in: [${leads}] }`);
  }

  if (variables.opportunityIds?.length) {
    const opportunities = variables.opportunityIds.map(id => `"${id}"`).join(', ');
    filterConditions.push(`opportunityId: { _in: [${opportunities}] }`);
  }

  if (variables.contactIds?.length) {
    const contacts = variables.contactIds.map(id => `"${id}"`).join(', ');
    filterConditions.push(`contactId: { _in: [${contacts}] }`);
  }

  if (variables.createdAfter) {
    filterConditions.push(`createdAt: { _gte: "${variables.createdAfter}" }`);
  }

  if (variables.createdBefore) {
    filterConditions.push(`createdAt: { _lte: "${variables.createdBefore}" }`);
  }

  if (variables.dueDateAfter) {
    filterConditions.push(`dueDate: { _gte: "${variables.dueDateAfter}" }`);
  }

  if (variables.dueDateBefore) {
    filterConditions.push(`dueDate: { _lte: "${variables.dueDateBefore}" }`);
  }

  return filterConditions;
};

/**
 * Builds complete where clause for GraphQL query
 */
export const buildWhereClause = (variables: SalesTaskQueryVariables): string => {
  const { search, where } = variables;
  
  const filterConditions = buildFilterConditions(variables);
  const searchCondition = buildSearchCondition(search);
  
  const allConditions = [...filterConditions];
  
  if (searchCondition) {
    allConditions.push(searchCondition);
  }
  
  if (where) {
    allConditions.push(JSON.stringify(where).slice(1, -1)); // Remove outer braces
  }

  return allConditions.length > 0 ? `where: { ${allConditions.join(', ')} }` : '';
};

/**
 * Builds orderBy clause for GraphQL query with support for nested objects
 * 
 * @param orderBy Array of order by objects
 * 
 * @example
 * // Simple field sorting
 * buildOrderByClause([{ title: 'ASC' }])
 * // Results in: [{ title: ASC }]
 * 
 * @example  
 * // Nested object sorting (automatically maps to sub-field)
 * buildOrderByClause([{ ownerEmployee: 'ASC' }])
 * // Results in: [{ ownerEmployee: { firstName: ASC } }]
 * 
 * @example
 * // Explicit nested object sorting
 * buildOrderByClause([{ ownerEmployee: { lastName: 'DESC' } }])
 * // Results in: [{ ownerEmployee: { lastName: DESC } }]
 */
export const buildOrderByClause = (orderBy?: any[]): string => {
  const defaultOrderBy = '[{ createdAt: DESC }]';
  
  if (!orderBy || !Array.isArray(orderBy) || orderBy.length === 0) {
    return defaultOrderBy;
  }
  
  // Handle orderBy array manually to ensure proper enum formatting and nested objects
  const orderByItems = orderBy.map(item => {
    const field = Object.keys(item)[0];
    const direction = item[field];
    
    // Handle nested object fields that require sub-field specification
    if (typeof direction === 'object' && direction !== null) {
      // Already properly structured nested object
      return `{ ${field}: ${JSON.stringify(direction).replace(/"(ASC|DESC)"/g, '$1')} }`;
    }
    
    // Handle known nested fields with sensible defaults
    switch (field) {
      case 'assignedEmployee':
        return `{ assignedEmployee: { firstName: ${direction} } }`;
      case 'account':
        return `{ account: { name: ${direction} } }`;
      case 'contact':
        return `{ contact: { firstName: ${direction} } }`;
      case 'lead':
        return `{ lead: { firstName: ${direction} } }`;
      case 'opportunity':
        return `{ opportunity: { name: ${direction} } }`;
      default:
        // Simple field (not nested)
        return `{ ${field}: ${direction} }`;
    }
  });
  
  return `[${orderByItems.join(', ')}]`;
};

/**
 * Builds complete arguments array for GraphQL query
 */
export const buildQueryArguments = (
  variables: SalesTaskQueryVariables,
  includeOrderBy: boolean = true
): string[] => {
  const { offset = 0, limit = 20, orderBy } = variables;
  
  const args: string[] = [];
  const whereClause = buildWhereClause(variables);
  
  if (whereClause) {
    args.push(whereClause);
  }
  
  if (includeOrderBy) {
    const orderByClause = buildOrderByClause(orderBy);
    args.push(`orderBy: ${orderByClause}`);
  }
  
  args.push(`limit: ${limit}`);
  args.push(`offset: ${offset}`);
  
  return args;
};

/**
 * Builds arguments for count queries (simpler, higher limit)
 */
export const buildCountQueryArguments = (variables: SalesTaskQueryVariables): string[] => {
  const args: string[] = [];
  const whereClause = buildWhereClause(variables);
  
  if (whereClause) {
    args.push(whereClause);
  }
  
  args.push(`limit: 10000`);
  
  return args;
}; 