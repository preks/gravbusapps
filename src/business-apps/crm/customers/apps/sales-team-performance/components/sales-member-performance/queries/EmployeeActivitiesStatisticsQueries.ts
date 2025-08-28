import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface ActivityStatisticsQueryVariables {
  employeeId: string;
  startDate?: string; // For filtering activities (e.g., this month)
  endDate?: string;
}

export interface ActivityStatisticsData {
  id: string;
  activityType?: {
    value: string;
  };
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  accountId?: string;
  createdAt: string;
}

export interface ActivityStatisticsResponse {
  SalesActivity: ActivityStatisticsData[];
  SalesActivityAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_EMPLOYEE_ACTIVITIES_STATISTICS = (variables: ActivityStatisticsQueryVariables): string => {
  const { employeeId, startDate, endDate } = variables;
  
  // Build where clause for filtering by employee and optional date range
  // Filter out activities with null createdAt by requiring a minimum date
  let whereClause = `ownerEmployeeId: {_eq: "${employeeId}"}, isDeleted: {_eq: false}`;
  
  if (startDate && endDate) {
    whereClause += `, createdAt: {_gte: "${startDate}", _lte: "${endDate}"}`;
  } else {
    // Exclude null createdAt by requiring date to be after 2020
    whereClause += `, createdAt: {_gte: "2020-01-01T00:00:00Z"}`;
  }

  return `
    query GetEmployeeActivitiesStatistics {
      SalesActivity(
        where: {${whereClause}}
        limit: 1000
        orderBy: [{createdAt: DESC_NULLS_LAST}]
      ) {
        id
        activityType {
          value
        }
        contactId
        leadId
        opportunityId
        accountId
        createdAt
      }
      
      SalesActivityAggregate(
        where: {${whereClause}}
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

export const useEmployeeActivitiesStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchEmployeeActivitiesStatistics = useCallback(async (variables: ActivityStatisticsQueryVariables = { employeeId: '' }) => {
    const query = GET_EMPLOYEE_ACTIVITIES_STATISTICS(variables);
    try {
      const result = await graphqlClient.request<ActivityStatisticsResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching employee activities statistics:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchEmployeeActivitiesStatistics };
}; 