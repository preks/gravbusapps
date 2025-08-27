import { useState, useEffect } from 'react';
import { useGetInvestmentLeadById } from '@/common/data/investment';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { Lead, ReferenceData } from '../types';

export const useLeadData = (leadId: string, accessToken: string) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadStatuses, setLeadStatuses] = useState<ReferenceData[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  const { fetchInvestmentLeadById, isLoading, error: fetchError } = useGetInvestmentLeadById({ accessToken });
  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchLeadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchInvestmentLeadById(leadId);
      
      if (result && result.lead) {
        const rawLeadData = result.lead;
        setLeadData(rawLeadData);
        
        // Transform InvestmentLead to Lead format for compatibility
        const transformedLead: Lead = rawLeadData;
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
        { catalogIdentifier: 'InvestmentLeadStatus', version: 'v1' },
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
        
        setLeadStatuses(sortedStatuses);
      }
    } catch (err) {
      console.error('Error fetching investment lead statuses:', err);
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

  // Update local state when fetch result changes
  useEffect(() => {
    if (fetchError) {
      setError(fetchError);
    }
  }, [fetchError]);

  return {
    lead,
    leadData,
    loading: loading || isLoading,
    error,
    leadStatuses,
    loadingStatuses,
    refetch: fetchLeadData
  };
}; 