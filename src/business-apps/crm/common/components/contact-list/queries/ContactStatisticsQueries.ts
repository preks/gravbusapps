import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCallback } from 'react';

export interface UseContactStatisticsQueriesProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export interface ContactStatisticsData {
  recentContacts: number;
  activeContacts: number;
  totalEmailEngagements: number;
  totalContactsThisYear: number;
}

// Query to get recent contacts count (past two weeks)
export const GET_RECENT_CONTACTS_COUNT = `
  query GetRecentContactsCount($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    ContactAggregate(where: {
      createdAt: {_gte: $twoWeeksAgo},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get active contacts count (contacts with recent activity)
export const GET_ACTIVE_CONTACTS_COUNT = `
  query GetActiveContactsCount($sourceApp: String) {
    ContactAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      activeTo: {_isNull: true}
    }) {
      aggregate {
        count
      }
    }
  }
`;



// Query to get total contacts count for this year
export const GET_TOTAL_CONTACTS_THIS_YEAR_COUNT = `
  query GetTotalContactsThisYearCount($startOfYear: timestamptz!, $sourceApp: String) {
    ContactAggregate(where: {
      createdAt: {_gte: $startOfYear},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`;

// Query to get total email engagements (contacts with email addresses)
export const GET_TOTAL_EMAIL_ENGAGEMENTS = `
  query GetTotalEmailEngagements($sourceApp: String) {
    ContactAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      email: {_isNull: false}
    }) {
      aggregate {
        count
      }
    }
  }
`;

export const useContactStatisticsQueries = (context: UseContactStatisticsQueriesProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  const { sourceApp } = context;

  const fetchRecentContacts = useCallback(async (): Promise<number> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        ContactAggregate: { aggregate: { count: number } }
      }>(GET_RECENT_CONTACTS_COUNT, { twoWeeksAgo, sourceApp });
      return result.ContactAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching recent contacts count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchActiveContacts = useCallback(async (): Promise<number> => {
    try {
      const result = await graphqlClient.request<{
        ContactAggregate: { aggregate: { count: number } }
      }>(GET_ACTIVE_CONTACTS_COUNT, { sourceApp });
      return result.ContactAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching active contacts count:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);



  const fetchTotalContactsThisYear = useCallback(async (): Promise<number> => {
    try {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
      
      const result = await graphqlClient.request<{
        ContactAggregate: { aggregate: { count: number } }
      }>(GET_TOTAL_CONTACTS_THIS_YEAR_COUNT, { startOfYear, sourceApp });
      return result.ContactAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching total contacts this year:', error);
      throw error;
    }
  }, [graphqlClient, sourceApp]);

  const fetchTotalEmailEngagements = useCallback(async (): Promise<number> => {
    try {
      const result = await graphqlClient.request<{
        ContactAggregate: { aggregate: { count: number } }
      }>(GET_TOTAL_EMAIL_ENGAGEMENTS, { sourceApp });
      return result.ContactAggregate.aggregate.count;
    } catch (error) {
      console.error('Error fetching total email engagements:', error);
      return 0;
    }
  }, [graphqlClient, sourceApp]);

  return {
    fetchRecentContacts,
    fetchActiveContacts,
    fetchTotalContactsThisYear,
    fetchTotalEmailEngagements
  };
}; 