import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  SalesActivity,
} from "../../sales-member-performance/types/activitiesTypes";
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { enforceQueryLimit } from "../../../../../utils/queryLimits";

// Extended interface for team activities with employee info
export interface TeamSalesActivity extends SalesActivity {
  ownerEmployeeId: string | null;
  ownerEmployee: {
    fullName: string;
    pictureThumbnail?: string | null;
  } | null;
  accountId: string | null;
  contactId: string | null;
  leadId: string | null;
  opportunityId: string | null;
  account: {
    email?: string | null;
    name: string;
    pictureUrl?: string | null;
  } | null;
  contact: {
    firstName: string;
    lastName: string;
    phone?: string | null;
    pictureUrl?: string | null;
    email?: string | null;
  } | null;
  lead: {
    name: string;
    companyEmail?: string | null;
    companyPhone?: string | null;
    contact?: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
  opportunity: {
    name: string;
    ownerEmployee?: {
      fullName: string;
    } | null;
  } | null;
}

interface UseTeamActivitiesDataProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  employeeIds: string[]; // Array of employee IDs for the team
  search?: string;
  sortField?: 'createdAt' | 'occurredAt' | 'title';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
}

interface UseTeamActivitiesDataResult {
  activities: TeamSalesActivity[];
  total: number;
  loading: boolean;
  error: string | null;
  loadActivities: () => Promise<void>;
  retry: () => void;
}

// GraphQL query for team activities (all employees in the team)
const GET_TEAM_ACTIVITIES_QUERY = `
  query GetTeamActivities($where: SalesActivityBoolExp, $orderBy: [SalesActivityOrderBy!], $limit: Int, $offset: Int) {
    SalesActivity(
      where: $where,
      orderBy: $orderBy,
      limit: $limit,
      offset: $offset
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

export const useTeamActivitiesData = ({
  employeeIds,
  search = "",
  sortField = 'createdAt',
  sortOrder = 'DESC',
  limit = 200,
  accessToken,
  userInfo,
}: UseTeamActivitiesDataProps): UseTeamActivitiesDataResult => {
  const [activities, setActivities] = useState<TeamSalesActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(accessToken);

  const loadActivities = useCallback(async () => {
    if (!accessToken || employeeIds.length === 0) {
      setActivities([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build where conditions for team activities
      const baseWhere: any = {
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

      // Add search conditions
      if (search?.trim()) {
        const searchPattern = { _ilike: `%${search.trim()}%` };
        baseWhere._and.push({
          _or: [
            { title: searchPattern },
            { description: searchPattern },
            { source: searchPattern },
            { account: { name: searchPattern } },
            { contact: { firstName: searchPattern } },
            { contact: { lastName: searchPattern } },
            { lead: { name: searchPattern } },
            { opportunity: { name: searchPattern } },
            { ownerEmployee: { fullName: searchPattern } }
          ]
        });
      }

      // Build orderBy
      const orderBy = [{ [sortField]: sortOrder }];

      const result = await graphqlClient.request<{
        SalesActivity: TeamSalesActivity[];
        SalesActivityAggregate: {
          aggregate: { count: number };
        };
      }>(GET_TEAM_ACTIVITIES_QUERY, {
        where: baseWhere,
        orderBy,
        limit: enforceQueryLimit(limit),
        offset: 0,
      });

      console.log('Team activities loaded:', result.SalesActivity?.length || 0);

      setActivities(result.SalesActivity || []);
      setTotal(result.SalesActivityAggregate?.aggregate?.count || 0);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load team activities';
      console.error('Error loading team activities:', err);
      setError(errorMessage);
      setActivities([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, employeeIds, search, sortField, sortOrder, limit, userInfo, graphqlClient]);

  const retry = useCallback(() => {
    loadActivities();
  }, [loadActivities]);

  return {
    activities,
    total,
    loading,
    error,
    loadActivities,
    retry,
  };
};
