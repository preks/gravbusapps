import React, { useState } from 'react';
import { Typography, Space, Button, Alert, Spin, notification, Tabs } from 'antd';
import { ReloadOutlined, SettingOutlined, PlusOutlined, DatabaseOutlined, BarChartOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PageLayout } from '@/components/layout/pageLayout';
import { QueryDefinition, QueryType, QueryStatus, Services, getAllServices, getServiceLabel } from '@/common/network/dataset';
import { useQueryManagerData } from './hooks/useQueryManagerData';
import { QueryDefinitionList } from './components/QueryDefinitionList';
import { QueryDefinitionForm } from './components/QueryDefinitionForm';

const { Title } = Typography;

const QueryManager: React.FC<BusinessAppContextProps> = (context) => {
  const [selectedQuery, setSelectedQuery] = useState<QueryDefinition | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeService, setActiveService] = useState<Services>(Services.EMPLOYEE);
  const [activeQueryType, setActiveQueryType] = useState<QueryType>(QueryType.DATASET);
  const [filters, setFilters] = useState<{
    status?: QueryStatus;
    search?: string;
  }>({});

  const {
    queries,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    actionError,
    totalQueries,
    currentPage,
    pageSize,
    loadQueries,
    createQuery,
    updateQuery,
    updateQueryStatus,
    deleteQuery,
    clearActionError,
    refetch
  } = useQueryManagerData(context, activeService, activeQueryType);

  // Handle form submission (create or update)
  const handleSaveQuery = async (
    queryData: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>,
    validate?: boolean
  ) => {
    let success = false;
    
    // Ensure the queryType matches the current active tab
    const dataWithQueryType = {
      ...queryData,
      queryType: activeQueryType
    };
    
    if (selectedQuery) {
      // Update existing query
      success = await updateQuery(selectedQuery.id!, dataWithQueryType, validate);
      if (success) {
        notification.success({
          message: 'Query Updated',
          description: 'Query definition has been updated successfully.',
        });
      }
    } else {
      // Create new query
      success = await createQuery(dataWithQueryType, validate);
      if (success) {
        notification.success({
          message: 'Query Created',
          description: 'Query definition has been created successfully.',
        });
      }
    }

    if (success) {
      setShowForm(false);
      setSelectedQuery(null);
    }
  };

  // Handle creating a new query
  const handleCreateQuery = () => {
    setSelectedQuery(null);
    setShowForm(true);
  };

  // Handle editing an existing query
  const handleEditQuery = (query: QueryDefinition) => {
    setSelectedQuery(query);
    setShowForm(true);
  };

  // Handle canceling form
  const handleCancelForm = () => {
    setShowForm(false);
    setSelectedQuery(null);
  };

  // Handle deleting a query
  const handleDeleteQuery = async (id: string) => {
    const success = await deleteQuery(id);
    if (success) {
      notification.success({
        message: 'Query Deleted',
        description: 'Query definition has been deleted successfully.',
      });
    }
  };

  // Handle toggling query status
  const handleToggleQueryStatus = async (id: string, newStatus: QueryStatus) => {
    const success = await updateQueryStatus(id, newStatus);
    if (success) {
      notification.success({
        message: 'Status Updated',
        description: `Query status has been updated to ${newStatus}.`,
      });
    }
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    loadQueries(newFilters, 0, pageSize);
  };

  const renderQueryTypeContent = () => (
    <div className="gba:max-w-7xl gba:mx-auto">
      {/* Error Display */}
      {error && (
        <Alert
          message="Error Loading Queries"
          description={error}
          type="error"
          showIcon
          closable
          className="gba:mb-4"
          action={
            <Button size="small" onClick={refetch}>
              Retry
            </Button>
          }
          data-testid="load-error-alert"
        />
      )}

      {/* Action Error Display */}
      {actionError && (
        <Alert
          message="Action Failed"
          description={actionError}
          type="error"
          showIcon
          closable
          onClose={clearActionError}
          className="gba:mb-4"
          data-testid="action-error-alert"
        />
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spin size="large" />
          <span className="gba:ml-3">Loading {activeQueryType.toLowerCase()} query definitions for {getServiceLabel(activeService)}...</span>
        </div>
      ) : (
        <QueryDefinitionList
          queries={queries}
          isLoading={isLoading}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          totalQueries={totalQueries}
          currentPage={currentPage}
          pageSize={pageSize}
          onEdit={handleEditQuery}
          onDelete={handleDeleteQuery}
          onStatusChange={handleToggleQueryStatus}
          onPageChange={(page, size) => loadQueries(filters, page - 1, size)}
          onFilter={handleFiltersChange}
          onCreateNew={handleCreateQuery}
        />
      )}

      {/* Query Form Modal */}
      <QueryDefinitionForm
        query={selectedQuery}
        visible={showForm}
        onSave={handleSaveQuery}
        onCancel={handleCancelForm}
        isLoading={isCreating || isUpdating}
        defaultQueryType={activeQueryType}
      />
    </div>
  );

  const renderServiceContent = (service: Services) => {
    const queryTypeTabItems = [
      {
        key: QueryType.DATASET,
        label: (
          <Space>
            <DatabaseOutlined />
            Dataset Queries
          </Space>
        ),
        children: renderQueryTypeContent()
      },
      {
        key: QueryType.TIMESERIES,
        label: (
          <Space>
            <BarChartOutlined />
            Timeseries Queries
          </Space>
        ),
        children: renderQueryTypeContent()
      }
    ];

    return (
      <Tabs
        activeKey={activeQueryType}
        onChange={(key) => setActiveQueryType(key as QueryType)}
        items={queryTypeTabItems}
        size="small"
        className="gba:h-full"
        data-testid={`query-type-tabs-${service}`}
      />
    );
  };

  const tabItems = getAllServices().map(service => ({
    key: service,
    label: (
      <Space>
        <DatabaseOutlined />
        {getServiceLabel(service)}
      </Space>
    ),
    children: renderServiceContent(service)
  }));

  return (
    <PageLayout
      headerIcon={<SettingOutlined />}
      headerLabel="Query Manager"
      pageHeaderRight={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateQuery}
            data-testid="create-query-button"
          >
            Create Query
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={refetch}
            loading={isLoading}
            data-testid="refresh-queries-button"
          >
            Refresh
          </Button>
        </Space>
      }
      contentContainer={
        <Tabs
          activeKey={activeService}
          onChange={(key) => setActiveService(key as Services)}
          items={tabItems}
          size="large"
          className="gba:h-full"
        />
      }
    />
  );
};

export { QueryManager };
export default QueryManager; 