import { useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { Lead } from "../../../../../components/lead-list/types";

export interface EmployeeLeadsQueryVariables {
  employeeId: string;
  offset?: number;
  limit?: number;
  orderBy?: Array<any>;
  where?: any;
}

export interface EmployeeLeadsResponse {
  Lead: Lead[];
  LeadAggregate: {
    aggregate: {
      count: number;
    };
  };
}

// Query to get leads owned by a specific employee
export const GET_EMPLOYEE_LEADS_QUERY = `
  query GetEmployeeLeads($offset: Int, $limit: Int, $orderBy: [LeadOrderBy!], $where: LeadBoolExp) {
    Lead(
      offset: $offset, 
      limit: $limit, 
      orderBy: $orderBy, 
      where: $where
    ) {
      id
      name
      firstName
      lastName
      email
      phoneNumber
      position
      companyName
      companyEmail
      companyPhone
      companyWebsite
      createdAt
      countryRef
      academicTitle {
        id
        code
        value
      }
      country {
        id
        code
        value
      }
      leadSource {
        id
        code
        value
      }
      leadStatus {
        id
        code
        value
        objectValue
      }
      leadRating {
        id
        code
        value
        objectValue
      }
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        picture
        pictureThumbnail
      }
      account {
        id
        name
      }
      contact {
        id
        firstName
        lastName
        email
        pictureUrl
        pictureThumbnailUrl
        phone
      }
    }
    LeadAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const useEmployeeLeadsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchEmployeeLeads = useCallback(
    async (
      variables: EmployeeLeadsQueryVariables
    ): Promise<EmployeeLeadsResponse> => {
      const baseWhere = {
        isDeleted: { _eq: false },
        ownerEmployeeId: { _eq: variables.employeeId },
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
        const result = await graphqlClient.request<EmployeeLeadsResponse>(
          GET_EMPLOYEE_LEADS_QUERY,
          requestVariables
        );
        return result;
      } catch (error) {
        console.error("Error fetching employee leads data:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchEmployeeLeads };
};
