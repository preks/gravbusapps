import { SalesTaskQueryVariables } from '../types/SalesTaskTypes';
import { buildQueryArguments, buildCountQueryArguments } from '../utils/salesTaskQueryBuilder';

/**
 * Combined GraphQL query to fetch sales tasks with full details AND count in one call
 */
/**
 * Original GraphQL query to fetch sales tasks with full details (for backward compatibility)
 */
export const GET_SALES_TASKS = (variables: SalesTaskQueryVariables): string => {
  const args = buildQueryArguments(variables);

  return `
    query GetSalesTasks {
      SalesTask(
        ${args.join(',\n        ')}
      ) {
        id
        name
        description
        dueDate
        createdAt
        updatedAt
        statusRef
        priorityRef
        typeRef
        assignedEmployeeId
        assignedEmployee {
          id
          firstName
          lastName
          displayName
          pictureThumbnail
          picture
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
          companyName
        }
        opportunity {
          id
          name
        }
        recordState
      }
    }
  `;
};

/**
 * Combined GraphQL query to fetch sales tasks with full details AND count in one call
 */
export const GET_SALES_TASKS_WITH_COUNT = (variables: SalesTaskQueryVariables): string => {
  const args = buildQueryArguments(variables);
  const countArgs = buildCountQueryArguments(variables);

  return `
    query GetSalesTasksWithCount {
      SalesTask(
        ${args.join(',\n        ')}
      ) {
        id
        name
        description
        dueDate
        createdAt
        updatedAt
        statusRef
        priorityRef
        typeRef
        assignedEmployeeId
        assignedEmployee {
          id
          firstName
          lastName
          displayName
          pictureThumbnail
          picture
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
          companyName
        }
        opportunity {
          id
          name
        }
        recordState
      }
      SalesTaskAggregate(
        ${countArgs.join(',\n        ')}
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

/**
 * GraphQL query to count sales tasks (for pagination)
 */
export const GET_SALES_TASKS_COUNT = (variables: SalesTaskQueryVariables): string => {
  const args = buildCountQueryArguments(variables);

  return `
    query GetSalesTasksCount {
      SalesTask(
        ${args.join(',\n        ')}
      ) {
        id
      }
    }
  `;
}; 