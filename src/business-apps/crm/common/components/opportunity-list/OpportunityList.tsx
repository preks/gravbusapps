import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Typography, Row, Col, Alert, Button, Space, Tag } from 'antd';
import { ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { useOpportunityListData } from './hooks/useOpportunityListData';
import { useOpportunityStatistics } from './hooks/useOpportunityStatistics';
import { useOpportunityFilters } from './hooks/useOpportunityFilters';
import OpportunityStatistics from './components/OpportunityStatistics';
import OpportunityTable from './components/OpportunityTable';
import { Opportunity } from './types';

const { Title } = Typography;

export interface OpportunityListProps extends BusinessAppContextProps {
  sourceApp: string;
  title?: string;
  showStatistics?: boolean;
  onOpportunityClick?: (opportunity: Opportunity) => void;
  className?: string;
}

const OpportunityList: React.FC<OpportunityListProps> = ({
  accessToken,
  userInfo,
  sourceApp,
  title = 'Opportunities',
  showStatistics = true,
  onOpportunityClick,
  className
}) => {
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const filters = useOpportunityFilters({ accessToken, userInfo });
  const appliedFilters = useMemo(() => filters.getFilters(), [filters]);

  const listDataParams = useMemo(() => ({
    search: appliedFilters.search,
    sortField,
    sortOrder,
    accessToken,
    sourceApp,
    stages: appliedFilters.stages,
    winningChanceRanges: appliedFilters.winningChanceRanges,
    amountRanges: appliedFilters.amountRanges,
    createdAfter: appliedFilters.createdAfter,
    createdBefore: appliedFilters.createdBefore
  }), [appliedFilters, sortField, sortOrder, accessToken, sourceApp]);

  const { 
    opportunities, 
    total, 
    loading, 
    error, 
    loadPage, 
    retry 
  } = useOpportunityListData(listDataParams);

  const { 
    statistics, 
    isLoading: statsLoading, 
    error: statsError, 
    refetch: refetchStats 
  } = useOpportunityStatistics({ accessToken, userInfo, sourceApp });

  // Load data when dependencies change
  useEffect(() => {
    loadPage(currentPage, pageSize);
  }, [loadPage, currentPage, pageSize]);

  // Load statistics
  useEffect(() => {
    if (showStatistics) {
      refetchStats();
    }
  }, [showStatistics, refetchStats]);

  const handleSort = useCallback((field: string, order: 'ASC' | 'DESC') => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number, size?: number) => {
    setCurrentPage(page);
    if (size) {
      setPageSize(size);
    }
  }, []);

  const handleRetry = useCallback(() => {
    retry();
    if (showStatistics) {
      refetchStats();
    }
  }, [retry, refetchStats, showStatistics]);

  const prefixDataTestId = useMemo(() => 
    `opportunity-list-${sourceApp.toLowerCase()}`, 
    [sourceApp]
  );

  if (error) {
    return (
      <div className={className} data-testid={`${prefixDataTestId}-error`}>
        <Alert
          message="Error Loading Opportunities"
          description={error.message}
          type="error"
          showIcon
          action={
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRetry}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={className} data-testid={`${prefixDataTestId}-container`}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Title level={4} className="gba:m-0">
            {title}
          </Title>
          <Tag color="blue" data-testid={`${prefixDataTestId}-count`}>
            {total} opportunities
          </Tag>
        </div>
        <Space>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFiltersVisible(!filtersVisible)}
            type={filters.selectedFilters.length > 0 ? 'primary' : 'default'}
            data-testid={`${prefixDataTestId}-filter-button`}
          >
            Filter {filters.selectedFilters.length > 0 && `(${filters.selectedFilters.length})`}
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRetry}
            loading={loading}
            data-testid={`${prefixDataTestId}-refresh-button`}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Statistics */}
      {showStatistics && (
        <OpportunityStatistics
          statistics={statistics}
          isLoading={statsLoading}
          error={statsError}
          onRetry={refetchStats}
        />
      )}

      {/* Search */}
      <Row gutter={[16, 16]} className="gba:mb-4">
        <Col xs={24} sm={12} md={8}>
          <DebouncedInput
            placeholder="Search opportunities..."
            value={filters.search}
            onChange={filters.setSearch}
            debounceDelay={300}
            data-testid={`${prefixDataTestId}-search`}
          />
        </Col>
      </Row>

      {/* Filters */}
      {filtersVisible && (
        <Card size="small" className="gba:mb-4">
          <div data-testid={`${prefixDataTestId}-filters`}>
            {/* TODO: Implement proper filter component matching expected interface */}
            <div className="gba:text-sm gba:text-gray-600">
              Filters: {filters.selectedFilters.join(', ')}
            </div>
          </div>
        </Card>
      )}

      {/* Selected Filters Display */}
      {filters.selectedFilters.length > 0 && (
        <div className="gba:mb-4">
          <Space wrap>
            <span className="gba:text-sm gba:text-gray-600">Active filters:</span>
            {filters.selectedFilters.map(filterId => (
              <Tag
                key={filterId}
                closable
                onClose={() => filters.removeFilter(filterId)}
                data-testid={`${prefixDataTestId}-active-filter-${filterId}`}
              >
                {filters.filterLabelMap[filterId]}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* Table */}
      <Card>
        <OpportunityTable
          data={opportunities}
          loading={loading}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onRowClick={onOpportunityClick}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            onChange: handlePageChange,
            showQuickJumper: true,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default OpportunityList; 