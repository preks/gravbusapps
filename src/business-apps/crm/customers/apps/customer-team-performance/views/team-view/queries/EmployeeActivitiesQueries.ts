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

export interface EmployeeActivityOwnerEmployee {
  fullName?: string;
  pictureThumbnail?: string;
}

export interface EmployeeActivityEntityAccount {
  email?: string;
  name?: string;
  pictureUrl?: string;
}

export interface EmployeeActivityEntityContact {
  firstName?: string;
  lastName?: string;
  phone?: string;
  pictureUrl?: string;
  email?: string;
}

export interface EmployeeActivityEntityLeadContact {
  firstName?: string;
  lastName?: string;
}

export interface EmployeeActivityEntityLead {
  name?: string;
  companyEmail?: string;
  companyPhone?: string;
  contact?: EmployeeActivityEntityLeadContact;
}

export interface EmployeeActivityEntityOpportunityOwnerEmployee {
  fullName?: string;
}

export interface EmployeeActivityEntityOpportunity {
  name?: string;
  ownerEmployee?: EmployeeActivityEntityOpportunityOwnerEmployee;
}

export interface EmployeeActivityTypeValue {
  value: string;
}

export interface EmployeeActivity {
  id?: string;
  source?: string;
  description?: string;
  title?: string;
  createdAt: string;
  ownerEmployeeId: string;
  ownerEmployee?: EmployeeActivityOwnerEmployee;
  activityType?: EmployeeActivityTypeValue;
  contactId?: string;
  leadId?: string;
  accountId?: string;
  opportunityId?: string;
  account?: EmployeeActivityEntityAccount;
  contact?: EmployeeActivityEntityContact;
  lead?: EmployeeActivityEntityLead;
  opportunity?: EmployeeActivityEntityOpportunity;
}

export interface EmployeeActivitiesResponse {
  SalesActivity: EmployeeActivity[];
  SalesActivityAggregate: {
    aggregate: {
      count: number;
    };
  };
}

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
      const baseWhere = {
        ownerEmployeeId: { _eq: variables.employeeId },
        isDeleted: { _eq: false },
      };

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

      const result = await graphqlClient.request<EmployeeActivitiesResponse>(
        GET_EMPLOYEE_ACTIVITIES_QUERY,
        requestVariables
      );

      return result;
    },
    [graphqlClient]
  );

  return { fetchEmployeeActivities };
};


