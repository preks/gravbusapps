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
  mostCommonJobTitle: string;
  mostCommonContactSource: string;
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

// Query to get most common job title in recent contacts
export const GET_MOST_COMMON_JOB_TITLE = `
  query GetMostCommonJobTitle($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    Contact(
      where: {
        createdAt: {_gte: $twoWeeksAgo}, 
        jobTitle: {_isNull: false},
        sourceApp: {_eq: $sourceApp},
        isDeleted: {_eq: false}
      }
    ) {
      jobTitle
    }
  }
`;

// Query to get most common contact source in recent contacts
export const GET_MOST_COMMON_CONTACT_SOURCE = `
  query GetMostCommonContactSource($twoWeeksAgo: timestamptz!, $sourceApp: String) {
    Contact(
      where: {
        createdAt: {_gte: $twoWeeksAgo}, 
        contactSource: {_isNull: false},
        sourceApp: {_eq: $sourceApp},
        isDeleted: {_eq: false}
      }
    ) {
      contactSource {
        id
        value
        code
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

  const fetchMostCommonJobTitle = useCallback(async (): Promise<string> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        Contact: Array<{ jobTitle: string | null }>
      }>(GET_MOST_COMMON_JOB_TITLE, { twoWeeksAgo, sourceApp });

      // Count occurrences of each job title
      const jobTitleCounts: Record<string, number> = {};
      result.Contact.forEach(contact => {
        const jobTitle = contact.jobTitle;
        if (jobTitle) {
          jobTitleCounts[jobTitle] = (jobTitleCounts[jobTitle] || 0) + 1;
        }
      });

      // Find the most common job title
      let mostCommon = 'N/A';
      let maxCount = 0;
      Object.entries(jobTitleCounts).forEach(([title, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = title;
        }
      });

      return mostCommon;
    } catch (error) {
      console.error('Error fetching most common job title:', error);
      return 'N/A';
    }
  }, [graphqlClient, sourceApp]);

  const fetchMostCommonContactSource = useCallback(async (): Promise<string> => {
    try {
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();
      
      const result = await graphqlClient.request<{
        Contact: Array<{ 
          contactSource: Array<{ value: string; code: string }> | null;
        }>
      }>(GET_MOST_COMMON_CONTACT_SOURCE, { twoWeeksAgo, sourceApp });

      // Count occurrences of each contact source
      const sourceCounts: Record<string, number> = {};
      result.Contact.forEach(contact => {
        const sources = contact.contactSource;
        if (sources && sources.length > 0) {
          sources.forEach(source => {
            if (source.value) {
              sourceCounts[source.value] = (sourceCounts[source.value] || 0) + 1;
            }
          });
        }
      });

      // Find the most common contact source
      let mostCommon = 'N/A';
      let maxCount = 0;
      Object.entries(sourceCounts).forEach(([source, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = source;
        }
      });

      return mostCommon;
    } catch (error) {
      console.error('Error fetching most common contact source:', error);
      return 'N/A';
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
    fetchMostCommonJobTitle,
    fetchMostCommonContactSource,
    fetchTotalContactsThisYear,
    fetchTotalEmailEngagements
  };
}; 