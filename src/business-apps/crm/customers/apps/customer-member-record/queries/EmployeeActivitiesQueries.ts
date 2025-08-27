import { useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface EmployeeActivitiesQueryVariables {
  employeeId: string;
  offset?: number;
  limit?: number;
  orderBy?: Array<any>;
  where?: any;
}

export interface ActivityReference {
  contactId?: string;
  leadId?: string;
  accountId?: string;
  opportunityId?: string;
  account?: {
    email?: string;
    name?: string;
    pictureUrl?: string;
  };
  contact?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    pictureUrl?: string;
    email?: string;
  };
  lead?: {
    name?: string;
    companyEmail?: string;
    companyPhone?: string;
    contact?: {
      firstName?: string;
      lastName?: string;
    };
  };
  opportunity?: {
    name?: string;
    ownerEmployee?: {
      fullName?: string;
    };
  };
}

export interface EmployeeActivity {
  id?: string;
  source?: string;
  description?: string;
  title?: string;
  createdAt: string;
  ownerEmployeeId: string;
  ownerEmployee: {
    fullName?: string;
    pictureThumbnail?: string;
  };
  activityType: {
    value: string;
  };
  contactId?: string;
  leadId?: string;
  accountId?: string;
  opportunityId?: string;
  account?: {
    email?: string;
    name?: string;
    pictureUrl?: string;
  };
  contact?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    pictureUrl?: string;
    email?: string;
  };
  lead?: {
    name?: string;
    companyEmail?: string;
    companyPhone?: string;
    contact?: {
      firstName?: string;
      lastName?: string;
    };
  };
  opportunity?: {
    name?: string;
    ownerEmployee?: {
      fullName?: string;
    };
  };
}

export interface EmployeeActivitiesResponse {
  SalesActivity: EmployeeActivity[];
  SalesActivityAggregate: {
    aggregate: {
      count: number;
    };
  };
}

// Query to get sales activities for a specific employee
export const GET_EMPLOYEE_ACTIVITIES_QUERY = `
  query GetEmployeeActivities($offset: Int, $limit: Int, $orderBy: [SalesActivityOrderBy!], $where: SalesActivityBoolExp) {
    SalesActivity(
      offset: $offset, 
      limit: $limit, 
      orderBy: $orderBy, 
      where: $where
    ) {
      id
      contactId
      leadId
      accountId
      opportunityId
      source
      description
      createdAt
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

export const useEmployeeActivitiesQueries = (
  context: BusinessAppContextProps
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchEmployeeActivities = useCallback(
    async (
      variables: EmployeeActivitiesQueryVariables
    ): Promise<EmployeeActivitiesResponse> => {
      // Build where clause with employee filter and additional conditions
      const baseWhere = {
        ownerEmployeeId: { _eq: variables.employeeId },
        isDeleted: { _eq: false },
      };

      // Merge with any additional where conditions
      const where = variables.where
        ? {
            _and: [baseWhere, variables.where],
          }
        : baseWhere;

      const requestVariables = {
        offset: variables.offset || 0,
        limit: variables.limit || 20,
        orderBy: variables.orderBy || [{ createdAt: "DESC" }],
        where,
      };

      try {
        const result = await graphqlClient.request<EmployeeActivitiesResponse>(
          GET_EMPLOYEE_ACTIVITIES_QUERY,
          requestVariables
        );

        return result;
      } catch (error) {
        console.error("Error fetching employee activities data:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchEmployeeActivities };
};
