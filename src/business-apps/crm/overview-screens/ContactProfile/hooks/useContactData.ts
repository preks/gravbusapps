import { useState, useEffect } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';

// Define the Contact interface based on the required fields
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  academicTitle?: string;
  jobTitle?: string;
  department?: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  version?: string;
  employeeId?: string;
  ownerEmployee?: {
    fullName?: string;
    id?: string;
  };
  // Added for OrganizationCard
  accountOwner?: string;
  sourceSystems?: string[];
  owner?: string;
  language?: string;
  location?: {
    city?: string;
    country?: string;
  };
  bio?: string;
  linkedinUrl?: string;
  xingUrl?: string;
  birthDate?: string;
  sources?: string[];
  lastContacted?: string;
}

// GraphQL query to fetch contact data
const CONTACT_QUERY = `
  query GetContact($id: uuid!) {
    ContactByPk(id: $id) {
      id
      version
      firstName
      lastName
      jobTitle
      department
      email
      phone
      ownerEmployee {
        fullName
        id
      }
      bio
      linkedinUrl
      xingUrl
      birthDate
    }
  }
`;

export const useContactData = (accessToken: string, contactId?: string) => {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const client = useGraphqlClient(accessToken);

  // Function to force a refetch of the contact data
  const refetchContact = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  useEffect(() => {
    const fetchContact = async () => {
      try {
        setLoading(true);
        // If no contactId is provided, don't fetch anything
        if (!contactId) {
          setLoading(false);
          return;
        }
        
        const response = await client.request(CONTACT_QUERY, { id: contactId });
        console.log('Contact data response:', response);
        
        if (response?.ContactByPk) {
          const contactData = {
            ...response.ContactByPk,
            company: response.ContactByPk.company?.name,
            accountOwner: response.ContactByPk.ownerEmployee?.fullName,
            owner: response.ContactByPk.ownerEmployee?.fullName,
            employeeId: response.ContactByPk.ownerEmployee?.id,
          };
          
          setContact(contactData);
        } else {
          setError(new Error(`Contact with ID ${contactId} not found`));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [accessToken, contactId, client, refreshKey]);

  return {
    contact,
    loading,
    error,
    refetchContact
  };
};
