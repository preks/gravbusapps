import React, { useState, useCallback, useEffect } from 'react';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useSalesCampaignData } from './hooks/useSalesCampaignData';
import { useCampaignFilters } from './hooks/useCampaignFilters';
import { CampaignStatistics, CampaignsTable, AddCampaignModal } from './components';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BarChartOutlined } from '@ant-design/icons';
import type { NewCampaignData } from './components/AddCampaignModal';

interface CampaignManagementContentProps extends BusinessAppContextProps {
  onBack?: () => void;
}

const CampaignManagementContent: React.FC<CampaignManagementContentProps> = (props) => {
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the centralized campaign filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    initializeFromUrl,
    startDateAfter: filterStartDateAfter,
    startDateBefore: filterStartDateBefore,
    endDateAfter: filterEndDateAfter,
    endDateBefore: filterEndDateBefore,
    createdAfter: filterCreatedAfter,
    createdBefore: filterCreatedBefore,
    handleStartDateRangeChange: filterHandleStartDateRangeChange,
    handleEndDateRangeChange: filterHandleEndDateRangeChange,
    handleCreatedDateRangeChange: filterHandleCreatedDateRangeChange,
    filtersInitialized,
  } = useCampaignFilters(props);

  const {
    campaigns,
    isLoading,
    error,
    totalCount,
    statistics,
    statisticsLoading,
    statisticsError,
    refetch,
    fetchCampaigns,
    processFiltersAndFetch,
    refetchStatistics
  } = useSalesCampaignData(props);

  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Handle table changes (pagination, sorting, filtering)
  const handleTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    const newPage = pagination.current || 1;
    const newPageSize = pagination.pageSize || 20;
    const newSortField = sorter.field || '';
    const newSortOrder = sorter.order === 'ascend' ? 'ASC' : 'DESC';

    setCurrentPage(newPage);
    setPageSize(newPageSize);
    setSortField(newSortField);
    setSortOrder(newSortOrder);

    const offset = (newPage - 1) * newPageSize;
    const orderBy = newSortField 
      ? [{ [newSortField]: newSortOrder } as { [key: string]: 'ASC' | 'DESC' }] 
      : [{ createdAt: 'DESC' } as { [key: string]: 'ASC' | 'DESC' }];

    fetchCampaigns({
      offset,
      limit: newPageSize,
      search,
      orderBy
    });
  }, [fetchCampaigns, search]);

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      selected ? addFilter(filterId) : removeFilter(filterId);
    },
    [addFilter, removeFilter]
  );

  // Function for DataController setFilter requirement
  const handleSetFilter = useCallback(
    (filters: string[]) => {
      // This is called by DataController's "Clear all filters" button or individual filter removal
      if (filters.length === 0) {
        // Clear all filters
        resetFilters();
      } else {
        // Handle individual filter removal - find which filters were removed and remove them
        const removedFilters = selectedFilters.filter(
          (f) => !filters.includes(f)
        );
        removedFilters.forEach((filterId) => removeFilter(filterId));
      }
    },
    [resetFilters, selectedFilters, removeFilter]
  );

  // Effect to handle filter changes
  useEffect(() => {
    if (filtersInitialized) {
      processFiltersAndFetch(
        search, 
        selectedFilters, 
        filterStartDateAfter, 
        filterStartDateBefore,
        filterEndDateAfter,
        filterEndDateBefore,
        filterCreatedAfter, 
        filterCreatedBefore
      );
    }
  }, [
    search, 
    selectedFilters, 
    filterStartDateAfter, 
    filterStartDateBefore,
    filterEndDateAfter,
    filterEndDateBefore,
    filterCreatedAfter, 
    filterCreatedBefore, 
    filtersInitialized, 
    processFiltersAndFetch
  ]);

  // Modal handlers
  const handleAddCampaign = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const handleSubmitCampaign = useCallback(async (campaignData: NewCampaignData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement campaign creation API call
      console.log('Creating campaign:', campaignData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close modal and refresh data
      setIsAddModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [refetch]);

  return (
    <>
      <PageLayout
        headerIcon={<BarChartOutlined />}
        headerLabel={getTranslationFromI18nKeyAndLabel('campaigns.page.title', 'Campaign Management')}
        contentContainer={
          <>
            {/* Statistics Section */}
            <div className="gba:mb-6" data-testid="campaign-statistics-section">
              <CampaignStatistics
                statistics={statistics || { totalCampaigns: 0, activeCampaigns: 0, completedCampaigns: 0, averageDuration: 0 }}
                isLoading={statisticsLoading}
                error={statisticsError}
                onRetry={refetchStatistics}
              />
            </div>

            {/* Campaigns Table Section */}
            <DataContainer
              dataControllerProps={{
                search,
                setSearch,
                debounceDelay: 500,
                filter: selectedFilters,
                setFilter: handleSetFilter,
                filterLabelMap,
                dateRange: {
                  createdAfter: filterCreatedAfter,
                  createdBefore: filterCreatedBefore,
                  onClear: () => filterHandleCreatedDateRangeChange(undefined, undefined),
                },
                listTitle: (
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span>Campaigns</span>
                      <span className="gba:text-gray-500">({totalCount})</span>
                    </div>
                  </div>
                ),
                addButton: {
                  onClick: handleAddCampaign,
                  label: "Add",
                  "data-testid": "add-campaign-button",
                },
              }}
              dataFilterProps={{
                filterGroups: filterGroups,
                onFilterChange: handleFilterChange,
              }}
              dataBody={
                <div data-testid="campaigns-table-container">
                  <CampaignsTable
                    campaigns={campaigns}
                    isLoading={isLoading}
                    error={error}
                    totalCount={totalCount}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onTableChange={handleTableChange}
                    accessToken={props.accessToken}
                  />
                </div>
              }
            />
          </>
        }
        data-testid="campaign-management-page"
      />
      
      {/* Add Campaign Modal */}
      <AddCampaignModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitCampaign}
        isLoading={isSubmitting}
        {...props}
      />
    </>
  );
};

interface CampaignManagementProps extends BusinessAppContextProps {
  onBack?: () => void;
}

const CampaignManagement: React.FC<CampaignManagementProps> = (props) => {
  return <CampaignManagementContent {...props} />;
};

export default CampaignManagement; 