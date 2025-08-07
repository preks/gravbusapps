import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCampaignRecordQueries } from '../queries';
import { CampaignEntity, UseCampaignEntitiesReturn } from '../types';

export const useCampaignEntities = (
  context: BusinessAppContextProps,
  campaignId: string
): UseCampaignEntitiesReturn => {
  const [entities, setEntities] = useState<CampaignEntity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  const { fetchCampaignEntities } = useCampaignRecordQueries(context);

  const transformEntitiesToUnified = useCallback((result: any): CampaignEntity[] => {
    const allEntities: CampaignEntity[] = [];

    // Transform leads
    if (result.leads) {
      result.leads.forEach((lead: any) => {
        allEntities.push({
          id: lead.id,
          name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
          type: 'lead',
          creationDate: lead.createdAt,
          firstName: lead.firstName,
          lastName: lead.lastName,
          owner: lead.ownerEmployee || {
            id: '',
            firstName: '',
            lastName: '',
            displayName: 'Unassigned'
          }
        });
      });
    }

    // Transform accounts
    if (result.accounts) {
      result.accounts.forEach((account: any) => {
        allEntities.push({
          id: account.id,
          name: account.name,
          type: 'account',
          creationDate: account.createdAt,
          owner: account.ownerEmployee || {
            id: '',
            firstName: '',
            lastName: '',
            displayName: 'Unassigned'
          }
        });
      });
    }

    // Transform contacts
    if (result.contacts) {
      result.contacts.forEach((contact: any) => {
        allEntities.push({
          id: contact.id,
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          type: 'contact',
          creationDate: contact.createdAt,
          firstName: contact.firstName,
          lastName: contact.lastName,
          owner: contact.ownerEmployee || {
            id: '',
            firstName: '',
            lastName: '',
            displayName: 'Unassigned'
          }
        });
      });
    }

    // Transform opportunities
    if (result.opportunities) {
      result.opportunities.forEach((opportunity: any) => {
        allEntities.push({
          id: opportunity.id,
          name: opportunity.name,
          type: 'opportunity',
          creationDate: opportunity.createdAt,
          owner: opportunity.ownerEmployee || {
            id: '',
            firstName: '',
            lastName: '',
            displayName: 'Unassigned'
          }
        });
      });
    }

    // Sort by creation date (newest first)
    return allEntities.sort((a, b) => 
      new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    );
  }, []);

  const loadCampaignEntities = useCallback(async () => {
    if (!context.accessToken || !campaignId) {
      setError('No access token or campaign ID available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      
      const result = await fetchCampaignEntities({
        campaignId,
        offset,
        limit: pageSize,
        search: search.trim() || undefined,
        orderBy: [{ createdAt: 'DESC' }]
      });

      const transformedEntities = transformEntitiesToUnified(result);
      setEntities(transformedEntities);
      
      // Calculate total count (in real implementation, this would come from a separate count query)
      const totalEntitiesCount = (result.leads?.length || 0) + 
                               (result.accounts?.length || 0) + 
                               (result.contacts?.length || 0) + 
                               (result.opportunities?.length || 0);
      setTotalCount(totalEntitiesCount);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEntities([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, campaignId, currentPage, pageSize, search, fetchCampaignEntities, transformEntitiesToUnified]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSetSearch = useCallback((searchTerm: string) => {
    setSearch(searchTerm);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const refetch = useCallback(() => {
    loadCampaignEntities();
  }, [loadCampaignEntities]);

  useEffect(() => {
    if (context.accessToken && campaignId) {
      loadCampaignEntities();
    }
  }, [context.accessToken, campaignId, currentPage, pageSize, search]);

  return {
    entities,
    totalCount,
    isLoading,
    error,
    currentPage,
    pageSize,
    search,
    setSearch: handleSetSearch,
    setPage,
    refetch
  };
};
