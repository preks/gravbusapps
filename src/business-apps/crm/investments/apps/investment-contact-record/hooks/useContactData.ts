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
  contactRole?: string;
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
        const rawContactData = result.contact;
        setContactData(rawContactData);
        
        // Transform data for UI compatibility
        const transformedContact: Contact = {
          id: rawContactData.id,
          firstName: rawContactData.firstName || '',
          lastName: rawContactData.lastName || '',
          email: rawContactData.email || '',
          phone: rawContactData.phone || '',
          jobTitle: rawContactData.jobTitle || '',
          linkedinUrl: rawContactData.linkedinUrl || '',
          xingUrl: rawContactData.xingUrl || '',
          bio: rawContactData.bio || '',
          contactRole: rawContactData.contactRole || '',
          contactType: rawContactData.contactType || '',
          version: rawContactData.version?.toString() || '1',
          academicTitle: rawContactData.academicTitle ? {
            id: rawContactData.academicTitle.id,
            value: rawContactData.academicTitle.value
          } : undefined,
          updatedAt: rawContactData.updatedAt,
          createdAt: rawContactData.createdAt,
          accountId: rawContactData.accountId,
          account: rawContactData.account ? {
            name: rawContactData.account.name,
            id: rawContactData.account.id
          } : undefined,
          ownerEmployee: rawContactData.ownerEmployee ? {
            id: rawContactData.ownerEmployee.id,
            firstName: rawContactData.ownerEmployee.firstName || '',
            lastName: rawContactData.ownerEmployee.lastName || '',
            displayName: rawContactData.ownerEmployee.displayName,
            fullName: rawContactData.ownerEmployee.fullName,
            employeePosition: rawContactData.ownerEmployee.employeePosition ? {
              company: rawContactData.ownerEmployee.employeePosition.company ? {
                name: rawContactData.ownerEmployee.employeePosition.company.name
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
    loading,
    error,
    contactStatuses,
    loadingStatuses,
    refetch: fetchContactData
  };
};
