import { useEffect, useState } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';

// Define the Contact type based on the GraphQL schema
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  linkedinUrl?: string;
  xingUrl?: string;
  updatedAt?: string;
  createdAt?: string;
  accountId?: string;
  account?: {
    name?: string;
    id?: string;
  };
  ownerEmployee?: {
    fullName?: string;
    employeePosition?: {
      company?: {
        name?: string;
      };
    };
  };
}

// Define the metrics data interface
export interface ContactsMetrics {
  totalContacts: number;
  emailEngagement: {
    percentage: number;
    change: string;
    changeType: 'increase' | 'decrease';
  };
  callActivity: {
    count: number;
    change: string;
    changeType: 'increase' | 'decrease';
  };
  meetingsScheduled: {
    count: number;
    change: string;
    changeType: 'increase' | 'decrease';
  };
}

// GraphQL query to fetch contacts
const CONTACTS_QUERY = `
  query GetContacts {
    Contact(where: { isDeleted: { _eq: false } }) {
      ownerEmployee {
        fullName
        employeePosition {
          company {
            name
          }
        } 
      }
      accountId
      account {
        name
        id
      }
      email
      phone
      jobTitle
      firstName
      lastName
      linkedinUrl
      updatedAt
      createdAt
      xingUrl
      id
      version
      isDeleted
    }
  }
`;

export const useContactsData = (accessToken: string) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [metrics, setMetrics] = useState<ContactsMetrics>({
    totalContacts: 0,
    emailEngagement: { percentage: 0, change: '0%', changeType: 'increase' },
    callActivity: { count: 0, change: '0%', changeType: 'increase' },
    meetingsScheduled: { count: 0, change: '0%', changeType: 'increase' }
  });
  const [loading, setLoading] = useState(true);
  
  const client = useGraphqlClient(accessToken)
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await client.request(CONTACTS_QUERY);
      
      if (response?.Contact) {
        const contactsData = response.Contact;
        setContacts(contactsData);
        
        calculateMetrics(contactsData);
      } 
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [accessToken]);

  const calculateMetrics = (contactsData: Contact[]) => {
    const totalContacts = contactsData.length;
    const emailEngagementPercentage = 0;
    
    const callCount = 0;
    const meetingsCount = 0;
    
    const emailChange = '0% from last month';
    const callChange = '0% from last month';
    const meetingsChange = '0% from last month';
    
    setMetrics({
      totalContacts,
      emailEngagement: {
        percentage: emailEngagementPercentage,
        change: emailChange,
        changeType: 'increase'
      },
      callActivity: {
        count: callCount,
        change: callChange,
        changeType: 'increase'
      },
      meetingsScheduled: {
        count: meetingsCount,
        change: meetingsChange,
        changeType: 'increase'
      }
    });
  };

  return {
    contacts,
    metrics,
    loading,
    refetch: fetchContacts
  };
};
