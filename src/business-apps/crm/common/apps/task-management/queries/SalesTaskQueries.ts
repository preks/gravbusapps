import { SalesTaskQueryVariables } from '../types/SalesTaskTypes';
import { buildQueryArguments, buildCountQueryArguments } from '../utils/salesTaskQueryBuilder';

/**
 * GraphQL query to fetch sales tasks with full details
 */
export const GET_SALES_TASKS = (variables: SalesTaskQueryVariables): { query: string; variables: any } => {
  const args = buildQueryArguments(variables);

  const query = `
    query GetSalesTasks($where: SalesTaskBoolExp, $orderBy: [SalesTaskOrderBy!], $limit: Int, $offset: Int) {
      SalesTask(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        id
        name
        description
        dueDate
        createdAt
        updatedAt
        version
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

  return { 
    query, 
    variables: {
      where: args.where,
      orderBy: args.orderBy,
      limit: args.limit,
      offset: args.offset
    }
  };
};

/**
 * Combined GraphQL query to fetch sales tasks with full details AND count in one call
 */
export const GET_SALES_TASKS_WITH_COUNT = (variables: SalesTaskQueryVariables): { query: string; variables: any } => {
  const args = buildQueryArguments(variables);
  const countArgs = buildCountQueryArguments(variables);

  const query = `
    query GetSalesTasksWithCount(
      $where: SalesTaskBoolExp, 
      $orderBy: [SalesTaskOrderBy!], 
      $limit: Int, 
      $offset: Int,
      $countWhere: SalesTaskBoolExp
    ) {
      SalesTask(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        id
        name
        description
        dueDate
        createdAt
        updatedAt
        version
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
        where: $countWhere
      ) {
        aggregate {
          count
        }
      }
    }
  `;

  return { 
    query, 
    variables: {
      where: args.where,
      orderBy: args.orderBy,
      limit: args.limit,
      offset: args.offset,
      countWhere: countArgs.where
    }
  };
};

/**
 * GraphQL query to count sales tasks (for pagination)
 */
export const GET_SALES_TASKS_COUNT = (variables: SalesTaskQueryVariables): { query: string; variables: any } => {
  const args = buildCountQueryArguments(variables);

  const query = `
    query GetSalesTasksCount($where: SalesTaskBoolExp, $limit: Int) {
      SalesTask(
        where: $where
        limit: $limit
      ) {
        id
      }
    }
  `;

  return { 
    query, 
    variables: {
      where: args.where,
      limit: args.limit
    }
  };
};

/**
 * GraphQL query to fetch historical task statistics for growth comparison
 */
export const GET_HISTORICAL_TASK_STATISTICS = (daysAgo: number = 30): { query: string; variables: any } => {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysAgo);
  
  const previousFromDate = new Date(fromDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  
  const query = `
    query GetHistoricalTaskStatistics($fromDate: timestamptz!, $previousFromDate: timestamptz!) {
      # Current period tasks
      currentTasks: SalesTask(
        where: {
          recordState: { _neq: "DELETED" }
          createdAt: { _gte: $fromDate }
        }
      ) {
        id
        statusRef
        dueDate
        createdAt
      }
      
      # Previous period tasks (for comparison)
      previousTasks: SalesTask(
        where: {
          recordState: { _neq: "DELETED" }
          createdAt: { 
            _gte: $previousFromDate
            _lt: $fromDate
          }
        }
      ) {
        id
        statusRef
        dueDate
        createdAt
      }
      
      # All tasks for totals
      allTasks: SalesTask(
        where: {
          recordState: { _neq: "DELETED" }
        }
      ) {
        id
        statusRef
        dueDate
        createdAt
      }
    }
  `;

  return { 
    query, 
    variables: { 
      fromDate: fromDate.toISOString(),
      previousFromDate: previousFromDate.toISOString()
    }
  };
}; 