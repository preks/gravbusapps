import { useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { TbChevronsDownLeft } from "react-icons/tb";
// Account interface matching the GraphQL schema
interface EmployeeAccount {
  id: string;
  version?: number;
  name: string;
  website?: string;
  legalForm?: {
    value: string;
    code: string;
    id: string;
    objectValue?: any;
  };
  numberOfEmployees?: {
    value: string;
  };
  contact?: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }[];
  addresses?: {
    city: string;
    country: {
      id: string;
      value: string;
      code: string;
    };
    region: {
      id: string;
      value: string;
      code: string;
    };
  }[];
  foundationDate?: string;
  industry?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  ownerEmployee?: {
    id: string;
    lastName: string;
    firstName: string;
    pictureThumbnail?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeAccountsQueryVariables {
  employeeId: string;
  offset?: number;
  limit?: number;
  orderBy?: Array<any>;
  where?: any;
}

export interface EmployeeAccountsResponse {
  Account: EmployeeAccount[];
  AccountAggregate: {
    aggregate: {
      count: number;
    };
  };
}

// Query to get accounts owned by a specific employee
export const GET_EMPLOYEE_ACCOUNTS_QUERY = `
  query GetEmployeeAccounts($offset: Int, $limit: Int, $orderBy: [AccountOrderBy!], $where: AccountBoolExp) {
    Account(
      offset: $offset, 
      limit: $limit, 
      orderBy: $orderBy, 
      where: $where
    ) {
      id
      version
      name
      website
      legalForm {
        value
        code
        id
        objectValue
      }
      numberOfEmployees {
        value
      }
      contact {
        id
        firstName
        lastName
        email
        phone
      }
      addresses {
        city
        country {
          id
          value
          code
        }
        region {
          id
          value
          code
        }
      }
      foundationDate
      industry {
        id
        code
        value
        objectValue
      }
      ownerEmployee {
        id
        lastName
        firstName
        pictureThumbnail
      }
      createdAt
      updatedAt
    }
    AccountAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const useEmployeeAccountsQueries = (
  context: BusinessAppContextProps
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchEmployeeAccounts = useCallback(
    async (
      variables: EmployeeAccountsQueryVariables
    ): Promise<EmployeeAccountsResponse> => {
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
      console.log("variables for account!!!!!", variables);
      console.log("requestVariables", requestVariables);
      try {
        const result = await graphqlClient.request<EmployeeAccountsResponse>(
          GET_EMPLOYEE_ACCOUNTS_QUERY,
          requestVariables
        );
        return result;
      } catch (error) {
        console.error("Error fetching employee accounts data:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchEmployeeAccounts };
};
