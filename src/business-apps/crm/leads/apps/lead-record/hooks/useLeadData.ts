import { useState, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { GET_LEAD_BY_ID, GetLeadByIdResponse } from '../queries/GetLeadByIdQueries';
import { Lead, ReferenceData } from '../types';

export const useLeadData = (leadId: string, accessToken: string) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadStatuses, setLeadStatuses] = useState<ReferenceData[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const graphQLClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchLeadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await graphQLClient.request<GetLeadByIdResponse>(
        GET_LEAD_BY_ID,
        { id: leadId }
      );
      
      if (result && result.Lead && result.Lead.length > 0) {
        const rawLeadData = result.Lead[0];
        setLeadData(rawLeadData);
        
        // Simple transformation for basic UI functionality
        const transformedLead: Lead = {
          id: rawLeadData.id,
          name: rawLeadData.companyName || `${rawLeadData.firstName || ''} ${rawLeadData.lastName || ''}`.trim() || 'Unknown Lead',
          logo: '',
          status: rawLeadData.leadStatus?.value || 'Qualified',
          leadName: rawLeadData.companyName || `${rawLeadData.firstName || ''} ${rawLeadData.lastName || ''}`.trim() || 'Unknown Lead',
          version: rawLeadData.version || '1',
          statusRef: rawLeadData.leadStatus?.value || '',
          source: {
            id: rawLeadData.leadSource?.value || 'website',
            type: 'leadSource',
            value: rawLeadData.leadSource?.value || 'Website',
            code: rawLeadData.leadSource?.value || 'website'
          },
          sourceRef: rawLeadData.leadSource?.value || '',
          rating: rawLeadData.leadRating?.value || 'Hot',
          industryRef: rawLeadData.industry?.id || '',
          industry: {
            value: rawLeadData.industry?.value || '',
            type: 'industry',
            id: rawLeadData.industry?.id || '',
            code: rawLeadData.industry?.id || ''
          },
          country: rawLeadData.country ? {
            value: rawLeadData.country.value || '',
            type: 'country',
            id: rawLeadData.country.id || '',
            code: rawLeadData.country.id || ''
          } : undefined,
          numberOfEmployeesRef: rawLeadData.numberOfEmployees?.id || '',
          numberOfEmployees: rawLeadData.numberOfEmployees ? {
            value: rawLeadData.numberOfEmployees.value || '',
            type: 'numberOfEmployees',
            id: rawLeadData.numberOfEmployees.id || '',
            code: rawLeadData.numberOfEmployees.id || ''
          } : undefined,
          companyWebsite: rawLeadData.companyWebsite || '',
          address: rawLeadData.addressLine || '',
          revenue: rawLeadData.annualRevenue?.value || '',
          ownerEmployeeId: rawLeadData.ownerEmployee?.firstName || '',
          ownerEmployee: {
            firstName: rawLeadData.ownerEmployee?.firstName || '',
            lastName: rawLeadData.ownerEmployee?.lastName || ''
          },
          ownerOrganization: {
            name: ''
          },
          annualRevenueRef: rawLeadData.annualRevenue?.id || '',
          annualRevenue: rawLeadData.annualRevenue ? {
            value: rawLeadData.annualRevenue.value || '',
            type: 'annualRevenue',
            id: rawLeadData.annualRevenue.id || '',
            code: rawLeadData.annualRevenue.id || ''
          } : undefined,
          regionRef: '',
          legalForm: rawLeadData.legalForm?.value || '',
          legalFormRef: rawLeadData.legalForm?.id || '',
          accountId: '',
          account: null,
          leadRating: {
            id: rawLeadData.leadRating?.value || 'hot',
            type: 'leadRating',
            value: rawLeadData.leadRating?.value || 'Hot',
            code: rawLeadData.leadRating?.value || 'hot'
          },
          leadRatingRef: rawLeadData.leadRating?.value || '',
          contact: {
            id: rawLeadData.id,
            version: rawLeadData.version || '1',
            email: rawLeadData.email || '',
            name: `${rawLeadData.firstName || ''} ${rawLeadData.lastName || ''}`.trim() || 'Unknown Contact',
            phone: rawLeadData.phoneNumber || '',
            pictureUrl: '',
            jobTitle: rawLeadData.position || ''
          },
          activities: [],
          opportunities: [],
          aiSummary: {
            text: "",
            insights: [],
            recommendations: []
          }
        };
        
        setLead(transformedLead);
      } else {
        setError('Lead not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lead data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'LeadStatus', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      );
      
      if (response && response.data) {
        const statusData = response.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value
        }));
        setLeadStatuses(statusData);
      }
    } catch (err) {
      console.error('Error fetching lead statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  };

  useEffect(() => {
    if (leadId && accessToken) {
      fetchLeadData();
      fetchLeadStatuses();
    }
  }, [leadId, accessToken]);

  return {
    lead,
    leadData,
    loading,
    error,
    leadStatuses,
    loadingStatuses,
    refetchLeadData: fetchLeadData
  };
}; 