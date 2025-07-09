import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

export interface ContactQueryVariables {
  id?: string;
  offset?: number;
  limit?: number;
  search?: string;
  sourceApp?: string;
  orderBy?: any[];
  where?: any;
}

export interface ContactDataResponse {
  Contact: any[];
  ContactAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_CONTACTS_DATA = (): string => {
  return `
    query GetContacts($offset: Int!, $limit: Int!, $orderBy: [ContactOrderBy!]!, $where: ContactBoolExp!) {
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
        jobTitle
        bio
        linkedinUrl
        xingUrl
        birthDate
        contactRole
        contactType
        academicTitle {
          id
          value
          code
        }
        account {
          id
          name
        }
        accountId
        ownerEmployee {
          id
          firstName
          lastName
          displayName
          pictureThumbnail
        }
        sourceApp
        createdAt
        updatedAt
      }
      ContactAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `;
};

export const GET_CONTACT_BY_ID = (variables: { id: string }): string => {
  return `
    query GetContactById($id: uuid!) {
      Contact(where: { id: { _eq: $id } }) {
        id
        firstName
        lastName
        email
        phone
        jobTitle
        bio
        linkedinUrl
        xingUrl
        birthDate
        contactRole
        contactType
        academicTitle {
          id
          value
          code
        }
        account {
          id
          name
        }
        accountId
        ownerEmployee {
          id
          firstName
          lastName
          displayName
          pictureThumbnail
        }
        sourceApp
        createdAt
        updatedAt
      }
    }
  `;
};

export const useGetContactsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchContactsData = useCallback(async (variables: ContactQueryVariables = {}) => {
    const query = GET_CONTACTS_DATA(variables);
    try {
      const result = await graphqlClient.request<ContactDataResponse>(query, {
        offset: variables.offset || 0,
        limit: variables.limit || 20,
        orderBy: variables.orderBy || [{ createdAt: 'DESC' }],
        where: variables.where || { isDeleted: { _eq: false } }
      });
      return result;
    } catch (error) {
      console.error('Error fetching contacts data:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchContactById = useCallback(async (id: string) => {
    const query = GET_CONTACT_BY_ID({ id });
    try {
      const result = await graphqlClient.request<{ Contact: any[] }>(query, { id });
      return result.Contact[0] || null;
    } catch (error) {
      console.error('Error fetching contact by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchContactsData, fetchContactById };
}; 