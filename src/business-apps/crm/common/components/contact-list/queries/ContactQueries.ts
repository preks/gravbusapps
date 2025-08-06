import { useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface ContactQueryVariables {
  offset?: number;
  limit?: number;
  where?: any;
  orderBy?: any;
}

export interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department?: string;
  contactType?: string;
  contactRole?: string;
  pictureUrl?: string;
  linkedinUrl?: string;
  xingUrl?: string;
  bio?: string;
  birthDate?: string;

  academicTitle?: {
    id: string;
    value: string;
    objectValue?: any;
  };
  updatedAt?: string;
  createdAt?: string;
  accountId?: string;
  account?: {
    name?: string;
    id?: string;
  };
  ownerEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    fullName?: string;
    pictureThumbnail?: string;
    employeePosition?: {
      company?: {
        name?: string;
      };
    };
  };
}

export interface GetContactsResponse {
  Contact: ContactData[];
  ContactAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_CONTACTS_DATA = `
  query GetContacts(
    $where: ContactBoolExp
    $limit: Int 
    $offset: Int
    $orderBy: [ContactOrderBy!]
  ) {
    Contact(
      where: $where 
      limit: $limit 
      offset: $offset
      orderBy: $orderBy
    ) {
      id
      firstName
      lastName
      email
      phone
      jobTitle
      department
      contactType
      contactRole
      pictureUrl
      linkedinUrl
      xingUrl
      bio
      birthDate
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
        pictureThumbnail
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

export const useGetContactsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchContactsData = useCallback(
    async (variables: ContactQueryVariables = {}) => {
      const query = GET_CONTACTS_DATA;
      try {
        const result = await graphqlClient.request<GetContactsResponse>(
          query,
          variables
        );
        return result;
      } catch (error) {
        console.error("Error fetching contacts data:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchContactsData };
};
