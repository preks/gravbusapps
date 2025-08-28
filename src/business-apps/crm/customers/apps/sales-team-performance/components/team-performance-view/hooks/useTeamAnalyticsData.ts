import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { TeamSalesActivity } from './useTeamActivitiesData';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

interface UseTeamAnalyticsDataProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeIds: string[];
}

interface UseTeamAnalyticsDataResult {
  activities: TeamSalesActivity[];
  total: number;
  loading: boolean;
  error: string | null;
  loadAnalyticsData: () => Promise<void>;
  retry: () => void;
}

// GraphQL query for comprehensive team analytics (no limit enforcement)
const GET_TEAM_ANALYTICS_QUERY = `
  query GetTeamAnalytics($where: SalesActivityBoolExp, $orderBy: [SalesActivityOrderBy!]) {
    SalesActivity(
      where: $where,
      orderBy: $orderBy,
      limit: 2000
    ) {
      id
      contactId
      leadId
      accountId
      opportunityId
      source
      description
      createdAt
      occurredAt
      createdBy
      ownerEmployeeId
      ownerEmployee {
        fullName
        pictureThumbnail
      }
      title
      activityType {
        value
      }
      account {
        email
        name
        pictureUrl
      }
      contact {
        firstName
        lastName
        phone
        pictureUrl
        email
      }
      lead {
        name
        companyEmail
        companyPhone
        contact {
          firstName
          lastName
        }
      }
      opportunity {
        name
        ownerEmployee {
          fullName
        }
      }
    }
    SalesActivityAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const useTeamAnalyticsData = ({
  employeeIds,
  accessToken,
  userInfo,
}: UseTeamAnalyticsDataProps): UseTeamAnalyticsDataResult => {
  const [activities, setActivities] = useState<TeamSalesActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(accessToken);

  const loadAnalyticsData = useCallback(async () => {
    if (!employeeIds.length || !accessToken) {
      console.log('useTeamAnalyticsData: No employee IDs or access token, skipping load');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('useTeamAnalyticsData: Loading comprehensive analytics data for', employeeIds.length, 'employees');

      // Build comprehensive where condition for team activities
      const baseWhere = {
        _and: [
          {
            _or: [
              // Activities owned by any team member
              { ownerEmployeeId: { _in: employeeIds } },
              // Unassigned activities created by team members (if userInfo available and user is in team)
              ...(userInfo && employeeIds.includes(userInfo.id) ? [{
                _and: [
                  { ownerEmployeeId: { _eq: null } },
                  { createdBy: { _eq: userInfo.id } }
                ]
              }] : [])
            ]
          },
          { isDeleted: { _eq: false } }
        ]
      };

      // Order by most recent first for analytics
      const orderBy = [{ createdAt: 'DESC' }];

      const result = await graphqlClient.request<{
        SalesActivity: TeamSalesActivity[];
        SalesActivityAggregate: {
          aggregate: { count: number };
        };
      }>(GET_TEAM_ANALYTICS_QUERY, {
        where: baseWhere,
        orderBy,
      });

      console.log('useTeamAnalyticsData: Analytics data loaded', {
        activitiesCount: result.SalesActivity?.length || 0,
        totalCount: result.SalesActivityAggregate?.aggregate?.count || 0
      });

      setActivities(result.SalesActivity || []);
      setTotal(result.SalesActivityAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error('useTeamAnalyticsData: Error loading analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team analytics data');
    } finally {
      setLoading(false);
    }
  }, [employeeIds, accessToken, userInfo, graphqlClient]);

  const retry = useCallback(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  return {
    activities,
    total,
    loading,
    error,
    loadAnalyticsData,
    retry,
  };
};
