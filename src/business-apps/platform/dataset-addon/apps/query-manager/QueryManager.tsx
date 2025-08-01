import React, { useState } from 'react';
import { 
  Button, 
  Alert, 
  Spinner, 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent
} from '@newwork/nw-design-system';
import { toast, Toaster } from 'sonner';
import { ArrowClockwiseIcon, GearIcon, PlusIcon, DatabaseIcon, ChartBarIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PageLayout } from '@/components/layout/pageLayout';
import { QueryDefinition, QueryType, QueryStatus, Services, getAllServices, getServiceLabel } from '@/common/network/dataset';
import { useQueryManagerData } from './hooks/useQueryManagerData';
import { QueryDefinitionList } from './components/QueryDefinitionList';
import { QueryDefinitionForm } from './components/QueryDefinitionForm';

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
        toast.success('Query Updated', {
          description: 'Query definition has been updated successfully.'
        });
      }
    } else {
      // Create new query
      success = await createQuery(dataWithQueryType, validate);
      if (success) {
        toast.success('Query Created', {
          description: 'Query definition has been created successfully.'
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
      toast.success('Query Deleted', {
        description: 'Query definition has been deleted successfully.'
      });
    }
  };

  // Handle toggling query status
  const handleToggleQueryStatus = async (id: string, newStatus: QueryStatus) => {
    const success = await updateQueryStatus(id, newStatus);
    if (success) {
      toast.success('Status Updated', {
        description: `Query status has been updated to ${newStatus}.`
      });
    }
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    loadQueries(newFilters, 0, pageSize);
  };

  const formatErrorMessage = (error: string) => {
    // Handle common error patterns
    if (error.includes('403')) {
      return 'Access denied. You don\'t have permission to access query definitions.';
    }
    if (error.includes('404')) {
      return 'Query service not found. Please check your configuration.';
    }
    if (error.includes('500')) {
      return 'Server error occurred. Please try again later or contact support.';
    }
    if (error.includes('Network Error') || error.includes('fetch')) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }
    
    // For other errors, try to extract meaningful message
    const match = error.match(/HTTP error! status: (\d+)/);
    if (match) {
      const status = match[1];
      return `Service unavailable (${status}). Please try again later.`;
    }
    
    // Fallback to original error but cleaned up
    return error.length > 100 ? error.substring(0, 100) + '...' : error;
  };

  const renderQueryTypeContent = () => (
    <div className="gba:max-w-7xl gba:mx-auto">
      {/* Action Error Display - Keep this separate since it's for actions */}
      {actionError && (
        <Alert 
          className="gba:border-destructive gba:bg-destructive/10"
          style={{ marginBottom: 'var(--spacing-4)' }}
          data-testid="action-error-alert"
        >
          <div className="gba:flex gba:items-start" style={{ gap: 'var(--spacing-3)' }}>
            <WarningCircleIcon 
              className="gba:shrink-0" 
              style={{ 
                color: 'var(--color-destructive)',
                marginTop: 'var(--spacing-1)' 
              }}
              size={20}
            />
            <div className="gba:flex-1">
              <h4 className="gba:font-semibold gba:text-lg" style={{ 
                color: 'var(--color-destructive)',
                margin: 'var(--spacing-0)'
              }}>
                Action Failed
              </h4>
              <p className="gba:text-sm" style={{ 
                color: 'var(--color-muted-foreground)',
                margin: 'var(--spacing-0)',
                marginTop: 'var(--spacing-1)'
              }}>
                {formatErrorMessage(actionError)}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={clearActionError} className="gba:shrink-0">
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="gba:flex gba:justify-center gba:items-center" style={{ 
          paddingTop: 'var(--spacing-12)', 
          paddingBottom: 'var(--spacing-12)' 
        }}>
          <Spinner />
          <span style={{ marginLeft: 'var(--spacing-3)' }}>Loading {activeQueryType.toLowerCase()} query definitions for {getServiceLabel(activeService)}...</span>
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
          error={error || undefined}
          onRetry={refetch}
          formatErrorMessage={formatErrorMessage}
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
    return (
      <Tabs value={activeQueryType} onValueChange={(value) => setActiveQueryType(value as QueryType)} className="gba:h-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2" data-testid={`query-type-tabs-${service}`}>
          <TabsTrigger value={QueryType.DATASET} className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-2)' }}>
            <DatabaseIcon />
            Dataset Queries
          </TabsTrigger>
          <TabsTrigger value={QueryType.TIMESERIES} className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-2)' }}>
            <ChartBarIcon />
            Timeseries Queries
          </TabsTrigger>
        </TabsList>
        <TabsContent value={QueryType.DATASET}>
          {renderQueryTypeContent()}
        </TabsContent>
        <TabsContent value={QueryType.TIMESERIES}>
          {renderQueryTypeContent()}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <>
      <PageLayout
        headerIcon={<GearIcon />}
        headerLabel="Query Manager"
        pageHeaderRight={
          <div className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-3)' }}>
            <Button
              variant="default"
              onClick={handleCreateQuery}
              data-testid="create-query-button"
              className="gba:flex gba:items-center"
              style={{ gap: 'var(--spacing-2)' }}
            >
              <PlusIcon />
              Create Query
            </Button>
            <Button
              variant="outline"
              onClick={refetch}
              disabled={isLoading}
              data-testid="refresh-queries-button"
              className="gba:flex gba:items-center"
              style={{ gap: 'var(--spacing-2)' }}
            >
              <ArrowClockwiseIcon />
              Refresh
            </Button>
          </div>
        }
        contentContainer={
          <Tabs value={activeService} onValueChange={(value) => setActiveService(value as Services)} className="gba:h-full">
            <TabsList className="gba:grid gba:w-full" style={{ gridTemplateColumns: `repeat(${getAllServices().length}, minmax(0, 1fr))` }}>
              {getAllServices().map(service => (
                <TabsTrigger key={service} value={service} className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-2)' }}>
                  <DatabaseIcon />
                  {getServiceLabel(service)}
                </TabsTrigger>
              ))}
            </TabsList>
            {getAllServices().map(service => (
              <TabsContent key={service} value={service}>
                {renderServiceContent(service)}
              </TabsContent>
            ))}
          </Tabs>
        }
      />
      <Toaster />
    </>
  );
};

export { QueryManager };
export default QueryManager; 