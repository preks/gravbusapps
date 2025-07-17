import { useState, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { GET_COMPANY_BY_ID, GetCompanyByIdResponse } from '../queries/company-queries';

export interface ReferenceData {
  id: string;
  code: string;
  value: string;
  alternativeCode?: string;
}

export interface Account {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  version: string;
  status?: string;
  industry?: string;
  website?: string;
  linkedin?: string;
  headquarters?: string;
  size?: string;
  founded?: string;
  legalForm?: string;
  revenue?: string;
  accountOwner?: {
    name: string;
  };
  numberOfEmployees?: {
    value: string;
  };
  addresses?: Array<{
    city?: string;
    country?: { value: string };
    region?: { value: string };
    postalCode?: string;
    addressLine?: string;
  }>;
  annualRevenue?: {
    value: string;
  };
  foundationDate?: string;
}

export const useAccountData = (accountId: string, accessToken: string) => {
  const [account, setAccount] = useState<Account | null>(null);
  const [accountData, setAccountData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountStatuses, setAccountStatuses] = useState<ReferenceData[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const graphQLClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await graphQLClient.request<GetCompanyByIdResponse>(
        GET_COMPANY_BY_ID,
        { id: accountId }
      );
      
      if (result && result.Account && result.Account.length > 0) {
        const rawAccountData = result.Account[0];
        setAccountData(rawAccountData);
        
        // Transform data for UI compatibility
        const transformedAccount: Account = {
          id: rawAccountData.id,
          name: rawAccountData.name || 'Unknown Account',
          email: rawAccountData.email || '',
          phone: rawAccountData.phone || '',
          version: rawAccountData.version?.toString() || '1',
          status: 'Active', // Default status as Account API doesn't expose status field yet
          industry: rawAccountData.industry?.value || '',
          website: rawAccountData.website || '',
          linkedin: '', // Not available in current API
          headquarters: rawAccountData.addresses?.[0]?.city || '',
          size: rawAccountData.numberOfEmployees?.value || '',
          founded: rawAccountData.foundationDate || '',
          legalForm: rawAccountData.legalForm?.value || '',
          revenue: rawAccountData.annualRevenue?.value || '',
          accountOwner: {
            name: rawAccountData.ownerEmployee ? 
              `${rawAccountData.ownerEmployee.firstName || ''} ${rawAccountData.ownerEmployee.lastName || ''}`.trim() : 
              'Unknown'
          },
          numberOfEmployees: rawAccountData.numberOfEmployees,
          addresses: rawAccountData.addresses,
          annualRevenue: rawAccountData.annualRevenue,
          foundationDate: rawAccountData.foundationDate
        };
        
        setAccount(transformedAccount);
      } else {
        setError('Account not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'AccountStatus', version: 'v1' },
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
        
        setAccountStatuses(sortedStatuses);
      }
    } catch (err) {
      console.error('Error fetching account statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  useEffect(() => {
    if (accountId && accessToken) {
      fetchAccountData();
      fetchAccountStatuses();
    }
  }, [accountId, accessToken]);

  return {
    account,
    accountData,
    loading,
    error,
    accountStatuses,
    loadingStatuses,
    refetchAccountData: fetchAccountData
  };
}; 