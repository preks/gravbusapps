import React, { useState, useCallback, useEffect } from 'react';
import { PageLayout } from '@/components/layout/pageLayout';
import { DataContainer } from '@/components/layout/dataContainer';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useSalesCampaignData } from './components/campaign-list/hooks/useSalesCampaignData';
import { useCampaignFilters } from './components/campaign-list/hooks/useCampaignFilters';
import { CampaignStatistics, CampaignsTable, AddCampaignModal, CampaignRecord } from './components';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
import { Tabs } from 'antd';
import type { NewCampaignData } from './components/campaign-list/AddCampaignModal';
import type { SalesCampaign } from './components/campaign-list/types/SalesCampaignTypes';

// Import campaigns analytics components
import { useCampaignsAnalytics } from './components/campaigns-analytics';
import CampaignsAnalyticsStatistics from './components/campaigns-analytics/components/CampaignsAnalyticsStatistics';
import CampaignsPerformanceComparison from './components/campaigns-analytics/components/CampaignsPerformanceComparison';
import CampaignsTimelineAnalysis from './components/campaigns-analytics/components/CampaignsTimelineAnalysis';
import CampaignsTopPerformers from './components/campaigns-analytics/components/CampaignsTopPerformers';
import CampaignsRevenueAnalysis from './components/campaigns-analytics/components/CampaignsRevenueAnalysis';
import CampaignsRevenueEfficiency from './components/campaigns-analytics/components/CampaignsRevenueEfficiency';

interface CampaignManagementContentProps extends BusinessAppContextProps {
  onBack?: () => void;
}

const CampaignManagementContent: React.FC<CampaignManagementContentProps> = (props) => {
  // Navigation state
  const [currentView, setCurrentView] = useState<'list' | 'record'>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<SalesCampaign | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  
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
    startDateAfter: filterStartDateAfter,
    startDateBefore: filterStartDateBefore,
    endDateAfter: filterEndDateAfter,
    endDateBefore: filterEndDateBefore,
    createdAfter: filterCreatedAfter,
    createdBefore: filterCreatedBefore,
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

  // Campaigns analytics data
  const {
    analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useCampaignsAnalytics(props);

  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Handle table changes (pagination, sorting, filtering)
  const handleTableChange = useCallback((pagination: any, _filters: any, sorter: any) => {
    const newPage = pagination.current || 1;
    const newPageSize = pagination.pageSize || 20;
    const newSortField = sorter.field || '';
    const newSortOrder = sorter.order === 'ascend' ? 'ASC' : 'DESC';

    setCurrentPage(newPage);
    setPageSize(newPageSize);

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

  // Navigation handlers
  const handleCampaignRowClick = useCallback((campaign: SalesCampaign) => {
    setSelectedCampaign(campaign);
    setCurrentView('record');
  }, []);

  const handleBackToList = useCallback(() => {
    setCurrentView('list');
    setSelectedCampaign(null);
  }, []);

  // Render campaign record view
  if (currentView === 'record' && selectedCampaign) {
    return (
      <CampaignRecord
        campaignId={selectedCampaign.id}
        onBack={handleBackToList}
        {...props}
      />
    );
  }

  // Overview Tab Component
  const OverviewTab = () => (
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
              onRowClick={handleCampaignRowClick}
              accessToken={props.accessToken}
            />
          </div>
        }
      />
    </>
  );

  // Analytics Tab Component
  const AnalyticsTab = () => (
    <div className="gba:space-y-6">
      {/* Analytics Statistics */}
      <CampaignsAnalyticsStatistics
        metrics={analyticsData.metrics}
        isLoading={analyticsLoading}
        error={analyticsError}
        onRetry={refetchAnalytics}
      />

      {/* Performance Comparison & Timeline Analysis */}
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <CampaignsPerformanceComparison
          campaignComparisons={analyticsData.campaignComparisons}
          isLoading={analyticsLoading}
          error={analyticsError}
          onRetry={refetchAnalytics}
        />
        <CampaignsTimelineAnalysis
          timelineAnalysis={analyticsData.timelineAnalysis}
          isLoading={analyticsLoading}
          error={analyticsError}
          onRetry={refetchAnalytics}
        />
      </div>

      {/* Revenue Analysis Charts */}
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <CampaignsRevenueAnalysis
          campaignComparisons={analyticsData.campaignComparisons}
          isLoading={analyticsLoading}
          error={analyticsError}
          onRetry={refetchAnalytics}
        />
        <CampaignsRevenueEfficiency
          campaignComparisons={analyticsData.campaignComparisons}
          isLoading={analyticsLoading}
          error={analyticsError}
          onRetry={refetchAnalytics}
        />
      </div>

      {/* Top Performers */}
      <CampaignsTopPerformers
        topCampaigns={analyticsData.topCampaigns}
        topEmployees={analyticsData.topEmployees}
        isLoading={analyticsLoading}
        error={analyticsError}
        onRetry={refetchAnalytics}
      />
    </div>
  );

  return (
    <>
      <PageLayout
        headerIcon={<BarChartOutlined />}
        headerLabel={getTranslationFromI18nKeyAndLabel('campaigns.page.title', 'Campaign Management')}
        contentContainer={
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            data-testid="campaign-management-tabs"
            items={[
              {
                label: (
                  <span>
                    <BarChartOutlined />
                    {getTranslationFromI18nKeyAndLabel('campaigns.tabs.overview', 'Overview')}
                  </span>
                ),
                key: 'overview',
                children: <OverviewTab />,
              },
              {
                label: (
                  <span>
                    <LineChartOutlined />
                    {getTranslationFromI18nKeyAndLabel('campaigns.tabs.analytics', 'Analytics')}
                  </span>
                ),
                key: 'analytics',
                children: <AnalyticsTab />,
              },
            ]}
          />
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