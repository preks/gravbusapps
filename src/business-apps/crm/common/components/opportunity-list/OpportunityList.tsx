import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DataContainer } from '@/components/layout/dataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useOpportunityListData } from './hooks/useOpportunityListData';
import { useOpportunityStatisticsWithTrend } from './hooks/useOpportunityStatisticsWithTrend';
import { useOpportunityFilters } from './hooks/useOpportunityFilters';
import { OpportunityStatisticsWithTrend } from './components/OpportunityStatistics';
import OpportunityTable from './components/OpportunityTable';
import { Opportunity } from './types';
import { Alert, Button } from 'antd';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { PlusOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { startProcess } from '@/common/utils/start-process';

interface OpportunityListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

const OpportunityList: React.FC<OpportunityListProps> = (context) => {
  const { sourceApp } = context;
  const locale = getCurrentActiveUserLocale();
  
  // State management
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const initialLoadDone = useRef(false);
  
  // Filters
  const opportunityFilters = useOpportunityFilters(context);
  const appliedFilters = opportunityFilters.getFilters();
  const { filtersInitialized } = opportunityFilters;
  
  // Data hooks with all filter parameters
  const opportunityListData = useOpportunityListData({
    search: appliedFilters.search,
    sortField,
    sortOrder,
    context: context,
    sourceApp,
    stages: appliedFilters.stages,
    winningChanceRanges: appliedFilters.winningChanceRanges,
    amountRanges: appliedFilters.amountRanges,
    statuses: appliedFilters.statuses,
    createdAfter: appliedFilters.createdAfter,
    createdBefore: appliedFilters.createdBefore
  });
  
  const opportunityStatistics = useOpportunityStatisticsWithTrend({
    ...context,
    sourceApp
  });

  // Initial load effect
  useEffect(() => {
    if (!initialLoadDone.current && context.accessToken && filtersInitialized) {
      initialLoadDone.current = true;
      opportunityListData.loadPage(1, pageSize);
      opportunityStatistics.refetch();
    }
  }, [context.accessToken, pageSize, filtersInitialized]); // Removed opportunityListData and opportunityStatistics from dependencies

  // Effect to reload data when filters change
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      setCurrentPage(1); // Reset to first page when filters change
      opportunityListData.loadPage(1, pageSize);
    }
  }, [
    appliedFilters.search,
    JSON.stringify(appliedFilters.stages), // Use JSON.stringify for array
    JSON.stringify(appliedFilters.winningChanceRanges), // Use JSON.stringify for array
    JSON.stringify(appliedFilters.amountRanges), // Use JSON.stringify for array
    JSON.stringify(appliedFilters.statuses), // Use JSON.stringify for array
    appliedFilters.createdAfter,
    appliedFilters.createdBefore,
    pageSize,
    filtersInitialized
  ]); // Removed opportunityListData from dependencies

  // Effect to reload data when sort changes
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      opportunityListData.loadPage(currentPage, pageSize);
    }
  }, [sortField, sortOrder, currentPage, pageSize, filtersInitialized]); // Removed opportunityListData from dependencies

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

  const handleSort = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    // When order is empty, clear sorting completely
    if (order === '') {
      setSortField('');
      setSortOrder('DESC'); // Keep DESC as default for state type, but field will be empty
      setCurrentPage(1);
    } else {
      setSortField(field);
      setSortOrder(order);
      setCurrentPage(1);
    }
  }, []);

  const handlePageChange = useCallback((page: number, size?: number) => {
    const newSize = size || pageSize;
    setCurrentPage(page);
    setPageSize(newSize);
    opportunityListData.loadPage(page, newSize);
  }, [pageSize]); // Removed opportunityListData from dependencies

  const handleSearch = useCallback((searchTerm: string) => {
    opportunityFilters.setSearch(searchTerm);
    setCurrentPage(1);
    // Data will reload automatically via useEffect
  }, [opportunityFilters]);

  const handleAddOpportunity = useCallback(() => {
    startProcess({
      domain: 'customer-relations',
      processName: 'saveOpportunity',
      builderType: 'NATIVE_SCREEN',
      payload: {}
    });
  }, []);

  const handleRetryStatistics = useCallback(() => {
    opportunityStatistics.refetch();
  }, [opportunityStatistics]);

  const handleRetryData = useCallback(() => {
    opportunityListData.loadPage(currentPage, pageSize);
  }, [currentPage, pageSize]); // Removed opportunityListData from dependencies

  // If there's an error loading opportunities, show error state
  if (opportunityListData.error) {
    return (
      <div data-testid="opportunity-list-error">
        <Alert
          message="Error Loading Opportunities"
          description={opportunityListData.error instanceof Error ? opportunityListData.error.message : String(opportunityListData.error)}
          type="error"
          showIcon
          data-testid="opportunity-list-error-alert"
          action={
            <Button size="small" onClick={handleRetryData}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div data-testid="opportunity-list-content">
      <div data-testid="opportunity-statistics-section" className="gba:mb-6">
        {opportunityStatistics.trendData ? (
          <OpportunityStatisticsWithTrend
            trendData={opportunityStatistics.trendData}
            isLoading={opportunityStatistics.isLoading}
            error={opportunityStatistics.error}
            onRetry={handleRetryStatistics}
          />
        ) : (
          <div>Loading statistics...</div>
        )}
      </div>

      <DataContainer
        dataControllerProps={{
          search: opportunityFilters.search,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: opportunityFilters.selectedFilters,
          setFilter: (filters: string[]) => {
            // This is called by DataController's "Clear all filters" button or individual filter removal
            if (filters.length === 0) {
              // Clear all filters
              opportunityFilters.clearAllFilters();
            } else {
              // Handle individual filter removal - find which filters were removed and remove them
              const removedFilters = opportunityFilters.selectedFilters.filter(f => !filters.includes(f));
              removedFilters.forEach(filterId => opportunityFilters.removeFilter(filterId));
            }
          },
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
            label: 'Add',
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