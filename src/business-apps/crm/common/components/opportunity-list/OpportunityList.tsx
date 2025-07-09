import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useOpportunityListData } from './hooks/useOpportunityListData';
import { useOpportunityStatistics } from './hooks/useOpportunityStatistics';
import { useOpportunityFilters } from './hooks/useOpportunityFilters';
import OpportunityStatistics from './components/OpportunityStatistics';
import OpportunityTable from './components/OpportunityTable';
import { Opportunity } from './types';
import { Alert, Button } from 'antd';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { ReloadOutlined, PlusOutlined, DollarCircleOutlined } from '@ant-design/icons';

interface OpportunityListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

const OpportunityList: React.FC<OpportunityListProps> = (context) => {
  const { sourceApp } = context;
  const locale = getCurrentActiveUserLocale();
  
  // State management
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const initialLoadDone = useRef(false);
  
  // Filters
  const opportunityFilters = useOpportunityFilters(context);
  const appliedFilters = opportunityFilters.getFilters();
  
  // Data hooks
  const opportunityListData = useOpportunityListData({
    search: appliedFilters.search,
    sortField,
    sortOrder,
    accessToken: context.accessToken,
    sourceApp,
    stages: appliedFilters.stages,
    createdAfter: appliedFilters.createdAfter,
    createdBefore: appliedFilters.createdBefore
  });
  
  const opportunityStatistics = useOpportunityStatistics({
    ...context,
    sourceApp
  });

  // Initial load effect
  useEffect(() => {
    if (!initialLoadDone.current && context.accessToken) {
      initialLoadDone.current = true;
      opportunityListData.loadPage(1, pageSize);
      opportunityStatistics.refetch();
    }
  }, [context.accessToken, opportunityListData, opportunityStatistics, pageSize]);

  // Handlers
  const handleOpportunityClick = useCallback((opportunity: Opportunity) => {
    setSelectedOpportunityId(opportunity.id);
    // TODO: Open opportunity detail side panel
    console.log('Opportunity clicked:', opportunity);
  }, []);

  const handleOpportunityEdit = useCallback((opportunity: Opportunity) => {
    setSelectedOpportunityId(opportunity.id);
    // TODO: Open opportunity edit modal
    console.log('Edit opportunity:', opportunity);
  }, []);

  const handleSort = useCallback((field: string, order: 'ASC' | 'DESC') => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
    opportunityListData.loadPage(1, pageSize);
  }, [opportunityListData, pageSize]);

  const handlePageChange = useCallback((page: number, size?: number) => {
    const newSize = size || pageSize;
    setCurrentPage(page);
    setPageSize(newSize);
    opportunityListData.loadPage(page, newSize);
  }, [opportunityListData, pageSize]);

  const handleSearch = useCallback((searchTerm: string) => {
    opportunityFilters.setSearch(searchTerm);
    setCurrentPage(1);
    opportunityListData.loadPage(1, pageSize);
  }, [opportunityFilters, opportunityListData, pageSize]);

  const handleAddOpportunity = useCallback(() => {
    // TODO: Open add opportunity modal
    console.log('Add opportunity clicked');
  }, []);

  const handleRetryStatistics = useCallback(() => {
    opportunityStatistics.refetch();
  }, [opportunityStatistics]);

  const handleRetryData = useCallback(() => {
    opportunityListData.loadPage(currentPage, pageSize);
  }, [opportunityListData, currentPage, pageSize]);

  if (opportunityListData.error && !opportunityListData.loading) {
    return (
      <div data-testid="opportunity-list-content">
        <div data-testid="opportunity-statistics-section" className="gba:mb-6">
          <OpportunityStatistics
            statistics={opportunityStatistics.statistics}
            isLoading={opportunityStatistics.isLoading}
            error={opportunityStatistics.error}
            onRetry={handleRetryStatistics}
          />
        </div>
        
        <Alert
          message="Error Loading Opportunities"
          description={opportunityListData.error instanceof Error ? opportunityListData.error.message : String(opportunityListData.error)}
          type="error"
          showIcon
          action={
            <Button icon={<ReloadOutlined />} onClick={handleRetryData}>
              Retry
            </Button>
          }
          data-testid="opportunity-list-error"
        />
      </div>
    );
  }

  return (
    <div data-testid="opportunity-list-content">
      <div data-testid="opportunity-statistics-section" className="gba:mb-6">
        <OpportunityStatistics
          statistics={opportunityStatistics.statistics}
          isLoading={opportunityStatistics.isLoading}
          error={opportunityStatistics.error}
          onRetry={handleRetryStatistics}
        />
      </div>

      <DataContainer
        dataControllerProps={{
          search: opportunityFilters.search,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: opportunityFilters.selectedFilters,
          setFilter: () => {}, // No-op for now
          filterLabelMap: opportunityFilters.filterLabelMap,
          dateRange: {
            createdAfter: opportunityFilters.createdAfter,
            createdBefore: opportunityFilters.createdBefore,
            onClear: () => opportunityFilters.handleDateRangeChange(undefined, undefined)
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Opportunities</span>
                <span className="gba:text-gray-500">({opportunityListData.total})</span>
              </div>
            </div>
          ),
          addButton: {
            onClick: handleAddOpportunity,
            label: 'Add Opportunity',
            'data-testid': 'add-opportunity-button'
          },
        }}
        dataFilterProps={{
          filterGroups: opportunityFilters.filterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            selected ? opportunityFilters.addFilter(filterId) : opportunityFilters.removeFilter(filterId);
          }
        }}
        dataBody={
          <div data-testid="opportunity-table-container">
            <OpportunityTable
              {...context}
              data={opportunityListData.opportunities}
              loading={opportunityListData.loading}
              error={opportunityListData.error}
              hasMore={opportunityListData.hasMore}
              loadMore={opportunityListData.loadMore}
              loadPage={opportunityListData.loadPage}
              retry={opportunityListData.retry}
              total={opportunityListData.total}
              pageSize={pageSize}
              currentPage={currentPage}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectOpportunity={handleOpportunityClick}
              onPaginationChange={handlePageChange}
              onSortingChange={handleSort}
              selectedOpportunityId={selectedOpportunityId}
            />
          </div>
        }
      />
    </div>
  );
};

export default OpportunityList; 