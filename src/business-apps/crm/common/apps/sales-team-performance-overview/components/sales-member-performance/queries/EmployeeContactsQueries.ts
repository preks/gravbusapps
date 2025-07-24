import { useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { Contact } from "../../../../../components/contact-list/types";

export interface EmployeeContactsQueryVariables {
  employeeId: string;
  offset?: number;
  limit?: number;
  orderBy?: Array<any>;
  where?: any;
}

export interface EmployeeContactsResponse {
  Contact: Contact[];
  ContactAggregate: {
    aggregate: {
      count: number;
    };
  };
}

// Query to get contacts owned by a specific employee
export const GET_EMPLOYEE_CONTACTS_QUERY = `
  query GetEmployeeContacts($offset: Int, $limit: Int, $orderBy: [ContactOrderBy!], $where: ContactBoolExp) {
    Contact(
      offset: $offset, 
      limit: $limit, 
      orderBy: $orderBy, 
      where: $where
    ) {
      id
      firstName
      lastName
      email
      phone
      pictureUrl
      jobTitle
      linkedinUrl
      xingUrl
      bio
      academicTitle {
        id
        value
        objectValue
      }
      updatedAt
      createdAt
      accountId
      account {
        name
        id
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        fullName
        employeePosition {
          company {
            name
          }
        }
      }
    }
    ContactAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const useEmployeeContactsQueries = (
  context: BusinessAppContextProps
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchEmployeeContacts = useCallback(
    async (
      variables: EmployeeContactsQueryVariables
    ): Promise<EmployeeContactsResponse> => {
      // Build where clause with employee filter and additional conditions
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
        const result = await graphqlClient.request<EmployeeContactsResponse>(
          GET_EMPLOYEE_CONTACTS_QUERY,
          requestVariables
        );
        return result;
      } catch (error) {
        console.error("Error fetching employee contacts data:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchEmployeeContacts };
};
