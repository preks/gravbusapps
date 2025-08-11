import React, { useState, useCallback } from 'react';
import { DataContainer } from '@/components/layout/dataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCampaignEntities } from '../hooks/useCampaignEntities';
import CampaignEntitiesTable from './CampaignEntitiesTable';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface CampaignEntitiesSectionProps extends BusinessAppContextProps {
  campaignId: string;
}

/**
 * Campaign Entities Section component that follows the exact same pattern as CampaignManagement
 */
export const CampaignEntitiesSection: React.FC<CampaignEntitiesSectionProps> = (props) => {
  const { campaignId } = props;

  // Use the campaign entities hook
  const {
    entities,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    search,
    sortField,
    sortOrder,
    setSearch,
    setPage,
    setSorting,
    refetch
  } = useCampaignEntities(props, campaignId);

  // Local state for features not yet implemented in the hook
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  // Create filter groups for entity types
  const entityTypeFilterGroups = [
    {
      id: 'entityTypes',
      label: getTranslationFromI18nKeyAndLabel('campaign.entities.filters.entityType', 'Entity Type'),
      options: [
        { id: 'lead', label: 'Leads', selected: selectedEntityTypes.includes('lead') },
        { id: 'account', label: 'Accounts', selected: selectedEntityTypes.includes('account') },
        { id: 'contact', label: 'Contacts', selected: selectedEntityTypes.includes('contact') },
        { id: 'opportunity', label: 'Opportunities', selected: selectedEntityTypes.includes('opportunity') }
      ]
    }
  ];

  // Create filter label map
  const filterLabelMap: Record<string, string> = {
    'lead': 'Leads',
    'account': 'Accounts', 
    'contact': 'Contacts',
    'opportunity': 'Opportunities'
  };

  // Get selected filters
  const selectedFilters = selectedEntityTypes;

  // Handle filter change
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      let newTypes = [...selectedEntityTypes];
      if (selected) {
        if (!newTypes.includes(filterId)) {
          newTypes.push(filterId);
        }
      } else {
        newTypes = newTypes.filter(type => type !== filterId);
      }
      setSelectedEntityTypes(newTypes);
    },
    [selectedEntityTypes]
  );

  // Handle set filter (for clear all)
  const handleSetFilter = useCallback(
    (filters: string[]) => {
      setSelectedEntityTypes(filters);
    },
    []
  );

  // Handle pagination change
  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    setPage(page);
    // Note: pageSize changes would need to be implemented in the hook if needed
  }, [setPage]);

  // Handle sorting change
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    if (order === '') {
      setSorting(undefined, undefined);
    } else {
      setSorting(field, order);
    }
  }, [setSorting]);

  // Handle table change (for compatibility)
  const handleTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    // This is called by the table for various changes
  }, []);

  return (
    <div data-testid="campaign-entities-section-content">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel('campaign.entities.title', 'Campaign Entities')}
                </span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
          searchPlaceholder: getTranslationFromI18nKeyAndLabel(
            'campaign.entities.search.placeholder', 
            'Search entities...'
          ),
          actions: [],
          "data-testid": "campaign-entities-data-controller",
        }}
        dataFilterProps={{
          filterGroups: entityTypeFilterGroups,
          onFilterChange: handleFilterChange,
        }}
        dataBody={
          <CampaignEntitiesTable
            entities={entities}
            isLoading={isLoading}
            error={error}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            sortField={sortField || ''}
            sortOrder={sortOrder || ''}
            onTableChange={handleTableChange}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            accessToken={props.accessToken}
          />
        }
      />
    </div>
  );
};

export default CampaignEntitiesSection;
