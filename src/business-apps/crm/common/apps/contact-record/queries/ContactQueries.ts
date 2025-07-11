import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

export interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  linkedinUrl?: string;
  xingUrl?: string;
  bio?: string;
  contactRole?: string;
  contactType?: string;
  version?: number;
  academicTitle?: {
    id: string;
    value: string;
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
    employeePosition?: {
      company?: {
        name?: string;
      };
    };
  };
}

export interface GetContactByIdResponse {
  Contact: ContactData[];
}

export const GET_CONTACT_BY_ID = `
  query GetContactById(
    $id: uuid!
  ) {
    Contact(
      where: { id: { _eq: $id } }
    ) {
      id
      firstName
      lastName
      email
      phone
      jobTitle
      linkedinUrl
      xingUrl
      bio
      contactRole
      contactType
      version
      academicTitle {
        id
        value
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
  }
`;

export const useGetContactById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchContactById = useCallback(async (contactId: string): Promise<ContactData | null> => {
    if (!contactId) return null;

    try {
      const result = await graphqlClient.request<GetContactByIdResponse>(
        GET_CONTACT_BY_ID,
        { id: contactId }
      );
      
      if (result && result.Contact && result.Contact.length > 0) {
        return result.Contact[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching contact by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchContactById };
}; 