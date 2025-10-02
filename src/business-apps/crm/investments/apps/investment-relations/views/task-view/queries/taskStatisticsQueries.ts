import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface TaskStatisticsQueryVariables {
  myTasksFilters?: {
    assignedEmployeeIds?: string[];
    taskStatusIds?: string[];
    taskPriorityIds?: string[];
    taskTypeIds?: string[];
    search?: string;
    createdAfter?: string;
    createdBefore?: string;
  };
  teamTasksFilters?: {
    taskStatusIds?: string[];
    taskPriorityIds?: string[];
    taskTypeIds?: string[];
    search?: string;
    createdAfter?: string;
    createdBefore?: string;
  };
}

export interface TaskStatisticsData {
  myTasks: {
    aggregate: {
      count: number;
    };
  };
  myTasksInProgress: {
    aggregate: {
      count: number;
    };
  };
  myTasksCompleted: {
    aggregate: {
      count: number;
    };
  };
  myTasksOverdue: {
    aggregate: {
      count: number;
    };
  };
  teamTasks: {
    aggregate: {
      count: number;
    };
  };
  teamTasksInProgress: {
    aggregate: {
      count: number;
    };
  };
  teamTasksCompleted: {
    aggregate: {
      count: number;
    };
  };
  teamTasksOverdue: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_TASK_STATISTICS = (variables: TaskStatisticsQueryVariables): string => {
  const { myTasksFilters, teamTasksFilters } = variables;

  // Build where conditions for my tasks
  const myTasksWhere = [];
  if (myTasksFilters?.assignedEmployeeIds?.length) {
    myTasksWhere.push(`assignedEmployeeId: {_in: [${myTasksFilters.assignedEmployeeIds.map(id => `"${id}"`).join(', ')}]}`);
  }
  if (myTasksFilters?.taskStatusIds?.length) {
    myTasksWhere.push(`taskStatusRef: {_in: [${myTasksFilters.taskStatusIds.map(id => `"${id}"`).join(', ')}]}`);
  }
  if (myTasksFilters?.taskPriorityIds?.length) {
    myTasksWhere.push(`taskPriorityRef: {_in: [${myTasksFilters.taskPriorityIds.map(id => `"${id}"`).join(', ')}]}`);
  }
  if (myTasksFilters?.taskTypeIds?.length) {
    myTasksWhere.push(`taskTypeRef: {_in: [${myTasksFilters.taskTypeIds.map(id => `"${id}"`).join(', ')}]}`);
  }
  if (myTasksFilters?.search?.trim()) {
    myTasksWhere.push(`_or: [
      {name: {_ilike: "%${myTasksFilters.search.trim()}%"}},
      {description: {_ilike: "%${myTasksFilters.search.trim()}%"}},
      {assignedEmployee: {firstName: {_ilike: "%${myTasksFilters.search.trim()}%"}}},
      {assignedEmployee: {lastName: {_ilike: "%${myTasksFilters.search.trim()}%"}}},
      {assignedEmployee: {displayName: {_ilike: "%${myTasksFilters.search.trim()}%"}}},
      {account: {name: {_ilike: "%${myTasksFilters.search.trim()}%"}}},
      {contact: {firstName: {_ilike: "%${myTasksFilters.search.trim()}%"}}},
      {contact: {lastName: {_ilike: "%${myTasksFilters.search.trim()}%"}}},
      {lead: {firstName: {_ilike: "%${myTasksFilters.search.trim()}%"}}},
      {lead: {lastName: {_ilike: "%${myTasksFilters.search.trim()}%"}}},
      {opportunity: {name: {_ilike: "%${myTasksFilters.search.trim()}%"}}}
    ]`);
  }
  if (myTasksFilters?.createdAfter) {
    myTasksWhere.push(`createdAt: {_gte: "${myTasksFilters.createdAfter}"}`);
  }
  if (myTasksFilters?.createdBefore) {
    myTasksWhere.push(`createdAt: {_lte: "${myTasksFilters.createdBefore}"}`);
  }

  // Build where conditions for team tasks
  const teamTasksWhere = [];
  if (teamTasksFilters?.taskStatusIds?.length) {
    teamTasksWhere.push(`taskStatusRef: {_in: [${teamTasksFilters.taskStatusIds.map(id => `"${id}"`).join(', ')}]}`);
  }
  if (teamTasksFilters?.taskPriorityIds?.length) {
    teamTasksWhere.push(`taskPriorityRef: {_in: [${teamTasksFilters.taskPriorityIds.map(id => `"${id}"`).join(', ')}]}`);
  }
  if (teamTasksFilters?.taskTypeIds?.length) {
    teamTasksWhere.push(`taskTypeRef: {_in: [${teamTasksFilters.taskTypeIds.map(id => `"${id}"`).join(', ')}]}`);
  }
  if (teamTasksFilters?.search?.trim()) {
    teamTasksWhere.push(`_or: [
      {name: {_ilike: "%${teamTasksFilters.search.trim()}%"}},
      {description: {_ilike: "%${teamTasksFilters.search.trim()}%"}},
      {assignedEmployee: {firstName: {_ilike: "%${teamTasksFilters.search.trim()}%"}}},
      {assignedEmployee: {lastName: {_ilike: "%${teamTasksFilters.search.trim()}%"}}},
      {assignedEmployee: {displayName: {_ilike: "%${teamTasksFilters.search.trim()}%"}}},
      {account: {name: {_ilike: "%${teamTasksFilters.search.trim()}%"}}},
      {contact: {firstName: {_ilike: "%${teamTasksFilters.search.trim()}%"}}},
      {contact: {lastName: {_ilike: "%${teamTasksFilters.search.trim()}%"}}},
      {lead: {firstName: {_ilike: "%${teamTasksFilters.search.trim()}%"}}},
      {lead: {lastName: {_ilike: "%${teamTasksFilters.search.trim()}%"}}},
      {opportunity: {name: {_ilike: "%${teamTasksFilters.search.trim()}%"}}}
    ]`);
  }
  if (teamTasksFilters?.createdAfter) {
    teamTasksWhere.push(`createdAt: {_gte: "${teamTasksFilters.createdAfter}"}`);
  }
  if (teamTasksFilters?.createdBefore) {
    teamTasksWhere.push(`createdAt: {_lte: "${teamTasksFilters.createdBefore}"}`);
  }

  const myTasksWhereClause = myTasksWhere.length > 0 ? `where: {${myTasksWhere.join(', ')}}` : '';
  const teamTasksWhereClause = teamTasksWhere.length > 0 ? `where: {${teamTasksWhere.join(', ')}}` : '';

  // Build status-specific where clauses
  const myTasksInProgressWhere = myTasksWhere.length > 0 
    ? `where: {${myTasksWhere.join(', ')}, taskStatusRef: {_in: ["InvestmentTaskStatus:v1:IN_PROGRESS"]}}`
    : 'where: {taskStatusRef: {_in: ["InvestmentTaskStatus:v1:IN_PROGRESS"]}}';
    
  const myTasksCompletedWhere = myTasksWhere.length > 0 
    ? `where: {${myTasksWhere.join(', ')}, taskStatusRef: {_in: ["InvestmentTaskStatus:v1:COMPLETED", "InvestmentTaskStatus:v1:DONE"]}}`
    : 'where: {taskStatusRef: {_in: ["InvestmentTaskStatus:v1:COMPLETED", "InvestmentTaskStatus:v1:DONE"]}}';
    
  const myTasksOverdueWhere = myTasksWhere.length > 0 
    ? `where: {${myTasksWhere.join(', ')}, taskStatusRef: {_in: ["InvestmentTaskStatus:v1:OVERDUE"]}}`
    : 'where: {taskStatusRef: {_in: ["InvestmentTaskStatus:v1:OVERDUE"]}}';
    
  const teamTasksInProgressWhere = teamTasksWhere.length > 0 
    ? `where: {${teamTasksWhere.join(', ')}, taskStatusRef: {_in: ["InvestmentTaskStatus:v1:IN_PROGRESS"]}}`
    : 'where: {taskStatusRef: {_in: ["InvestmentTaskStatus:v1:IN_PROGRESS"]}}';
    
  const teamTasksCompletedWhere = teamTasksWhere.length > 0 
    ? `where: {${teamTasksWhere.join(', ')}, taskStatusRef: {_in: ["InvestmentTaskStatus:v1:COMPLETED", "InvestmentTaskStatus:v1:DONE"]}}`
    : 'where: {taskStatusRef: {_in: ["InvestmentTaskStatus:v1:COMPLETED", "InvestmentTaskStatus:v1:DONE"]}}';
    
  const teamTasksOverdueWhere = teamTasksWhere.length > 0 
    ? `where: {${teamTasksWhere.join(', ')}, taskStatusRef: {_in: ["InvestmentTaskStatus:v1:OVERDUE"]}}`
    : 'where: {taskStatusRef: {_in: ["InvestmentTaskStatus:v1:OVERDUE"]}}';

  return `
    query GetTaskStatistics {
      myTasks: InvestmentTaskAggregate${myTasksWhereClause ? `(${myTasksWhereClause})` : ''} {
        aggregate {
          count
        }
      }
      
      myTasksInProgress: InvestmentTaskAggregate(${myTasksInProgressWhere}) {
        aggregate {
          count
        }
      }
      
      myTasksCompleted: InvestmentTaskAggregate(${myTasksCompletedWhere}) {
        aggregate {
          count
        }
      }
      
      myTasksOverdue: InvestmentTaskAggregate(${myTasksOverdueWhere}) {
        aggregate {
          count
        }
      }
      
      teamTasks: InvestmentTaskAggregate${teamTasksWhereClause ? `(${teamTasksWhereClause})` : ''} {
        aggregate {
          count
        }
      }
      
      teamTasksInProgress: InvestmentTaskAggregate(${teamTasksInProgressWhere}) {
        aggregate {
          count
        }
      }
      
      teamTasksCompleted: InvestmentTaskAggregate(${teamTasksCompletedWhere}) {
        aggregate {
          count
        }
      }
      
      teamTasksOverdue: InvestmentTaskAggregate(${teamTasksOverdueWhere}) {
        aggregate {
          count
        }
      }
    }
  `;
};

export const useGetTaskStatistics = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchTaskStatistics = useCallback(async (variables: TaskStatisticsQueryVariables = {}) => {
    const query = GET_TASK_STATISTICS(variables);
    try {
      const result = await graphqlClient.request<TaskStatisticsData>(query);
      return result;
    } catch (error) {
      console.error('Error fetching task statistics:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchTaskStatistics };
};
