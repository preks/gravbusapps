import { useState, useEffect } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useGetInvestmentContactById } from '@/common/data/investment/hooks/useInvestmentContacts';
import type { InvestmentContact } from '@/common/data/investment/types';

export interface ReferenceData {
  id: string;
  code: string;
  value: string;
  alternativeCode?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  linkedinUrl?: string;
  xingUrl?: string;
  bio?: string;
  contactType?: string;
  version: string;
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

export const useContactData = (contactId: string, accessToken: string) => {
  const [contact, setContact] = useState<Contact | null>(null);
  const [contactData, setContactData] = useState<InvestmentContact | null>(null);
  const [rawContactData, setRawContactData] = useState<InvestmentContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contactStatuses, setContactStatuses] = useState<ReferenceData[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const { fetchInvestmentContactById } = useGetInvestmentContactById({ accessToken });
  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchContactData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchInvestmentContactById(contactId);
      
      if (result && result.contact) {
        setRawContactData(result.contact);
        setContactData(result.contact);
        
        // Transform data for UI compatibility
        const transformedContact: Contact = {
          id: result.contact.id,
          firstName: result.contact.firstName || '',
          lastName: result.contact.lastName || '',
          email: result.contact.email || '',
          phone: result.contact.phone || '',
          jobTitle: result.contact.jobTitle || '',
          linkedinUrl: result.contact.linkedinUrl || '',
          xingUrl: result.contact.xingUrl || '',
          bio: result.contact.bio || '',
          contactType: result.contact.contactType || '',
          version: result.contact.version?.toString() || '1',
          academicTitle: result.contact.academicTitle ? {
            id: result.contact.academicTitle.id,
            value: result.contact.academicTitle.value
          } : undefined,
          updatedAt: result.contact.updatedAt,
          createdAt: result.contact.createdAt,
          accountId: result.contact.accountId,
          account: result.contact.account ? {
            name: result.contact.account.name,
            id: result.contact.account.id
          } : undefined,
          ownerEmployee: result.contact.ownerEmployee ? {
            id: result.contact.ownerEmployee.id,
            firstName: result.contact.ownerEmployee.firstName || '',
            lastName: result.contact.ownerEmployee.lastName || '',
            displayName: result.contact.ownerEmployee.displayName,
            fullName: result.contact.ownerEmployee.fullName,
            employeePosition: result.contact.ownerEmployee.employeePosition ? {
              company: result.contact.ownerEmployee.employeePosition.company ? {
                name: result.contact.ownerEmployee.employeePosition.company.name
              } : undefined
            } : undefined
          } : undefined
        };
        
        setContact(transformedContact);
      } else {
        setError('Investment Contact not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch investment contact data');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'InvestmentContactStatus', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      );
      
      if (response && response.data) {
        const statusData = response.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
        }));
        
        // Sort by alternativeCode in ascending order (1, 2, 3, etc.)
        const sortedStatuses = statusData.sort((a, b) => {
          const aCode = parseInt(a.alternativeCode || '999');
          const bCode = parseInt(b.alternativeCode || '999');
          return aCode - bCode;
        });
        
        setContactStatuses(sortedStatuses);
      }
    } catch (err) {
      console.error('Error fetching investment contact statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  useEffect(() => {
    if (contactId && accessToken) {
      fetchContactData();
      fetchContactStatuses();
    }
  }, [contactId, accessToken]);

  return {
    contact,
    contactData,
    rawContactData,
    loading,
    error,
    contactStatuses,
    loadingStatuses,
    refetch: fetchContactData
  };
};
