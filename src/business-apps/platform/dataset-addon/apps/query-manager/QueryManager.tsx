import React, { useEffect, useRef, useState } from 'react'
import { Button, Alert, Tabs, TabsList, TabsTrigger, TabsContent, toast, Toaster } from '@newwork/nw-design-system'
import { ArrowClockwiseIcon, GearIcon, DatabaseIcon, ChartBarIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout } from '@/components/layout/pageLayout'
import {
  QueryDefinition,
  QueryType,
  QueryStatus,
  Services,
  getAllServices,
  getServiceLabel
} from '@/common/network/dataset'
import { useQueryManagerData } from './hooks/useQueryManagerData'
import { QueryDefinitionList } from './components/QueryDefinitionList'
import { QueryDefinitionForm } from './components/QueryDefinitionForm'

const QueryManager: React.FC<BusinessAppContextProps> = context => {
  const [selectedQuery, setSelectedQuery] = useState<QueryDefinition | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [activeService, setActiveService] = useState<Services>(Services.EMPLOYEE)
  const [activeQueryType, setActiveQueryType] = useState<QueryType>(QueryType.DATASET)
  const [filters, setFilters] = useState<{
    status?: QueryStatus
    search?: string
  }>({})
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup debounce timer on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current)
      }
    }
  }, [])

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
  } = useQueryManagerData(context, activeService, activeQueryType)

  // Handle form submission (create or update)
  const handleSaveQuery = async (
    queryData: Omit<QueryDefinition, 'id' | 'createdAt' | 'updatedAt'>,
    validate?: boolean
  ) => {
    let success = false

    if (selectedQuery) {
      // Update existing query
      success = await updateQuery(selectedQuery.id!, queryData, validate)
      if (success) {
        toast.success('Query Updated', {
          description: 'Query definition has been updated successfully.'
        })
      }
    } else {
      // Create new query
      success = await createQuery(queryData, validate)
      if (success) {
        toast.success('Query Created', {
          description: 'Query definition has been created successfully.'
        })
      }
    }

    if (success) {
      setShowForm(false)
      setSelectedQuery(null)
    }
  }

  // Handle creating a new query
  const handleCreateQuery = () => {
    setSelectedQuery(null)
    setShowForm(true)
  }

  // Handle editing an existing query
  const handleEditQuery = (query: QueryDefinition) => {
    setSelectedQuery(query)
    setShowForm(true)
  }

  // Handle canceling form
  const handleCancelForm = () => {
    setShowForm(false)
    setSelectedQuery(null)
  }

  // Handle deleting a query
  const handleDeleteQuery = async (id: string) => {
    const success = await deleteQuery(id)
    if (success) {
      toast.success('Query Deleted', {
        description: 'Query definition has been deleted successfully.'
      })
    }
  }

  // Handle toggling query status
  const handleToggleQueryStatus = async (id: string, newStatus: QueryStatus) => {
    const success = await updateQueryStatus(id, newStatus)
    if (success) {
      toast.success('Status Updated', {
        description: `Query status has been updated to ${newStatus}.`
      })
    }
  }

  // Handle filters change
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    // debounce load to avoid refresh on every keystroke
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }
    filterDebounceRef.current = setTimeout(() => {
      loadQueries(newFilters, 0, pageSize)
    }, 300)
  }

  const formatErrorMessage = (error: string) => {
    // Handle common error patterns
    if (error.includes('403')) {
      return "Access denied. You don't have permission to access query definitions."
    }
    if (error.includes('404')) {
      return 'Query service not found. Please check your configuration.'
    }
    if (error.includes('500')) {
      return 'Server error occurred. Please try again later or contact support.'
    }
    if (error.includes('Network Error') || error.includes('fetch')) {
      return 'Network connection failed. Please check your internet connection and try again.'
    }

    // For other errors, try to extract meaningful message
    const match = error.match(/HTTP error! status: (\d+)/)
    if (match) {
      const status = match[1]
      return `Service unavailable (${status}). Please try again later.`
    }

    // Fallback to original error but cleaned up
    return error.length > 100 ? error.substring(0, 100) + '...' : error
  }

  const renderQueryTypeContent = () => (
    <div
      className="gba:h-full gba:w-full"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        gap: 'var(--nw-spacing-4)'
      }}
    >
      {/* Action Error Display - Keep this separate since it's for actions */}
      {actionError && (
        <Alert
          className="gba:border-destructive gba:bg-destructive/10 gba:w-full"
          style={{ marginBottom: 'var(--nw-spacing-4)' }}
          data-testid="action-error-alert"
        >
          <div className="gba:flex gba:items-start gba:w-full" style={{ gap: 'var(--nw-spacing-3)' }}>
            <WarningCircleIcon
              className="gba:shrink-0"
              style={{
                color: 'var(--nw-color-destructive)',
                marginTop: 'var(--nw-spacing-1)'
              }}
              size={20}
            />
            <div className="gba:flex-1 gba:min-w-0">
              <h4
                className="gba:font-semibold gba:text-lg"
                style={{
                  color: 'var(--nw-color-destructive)',
                  margin: 'var(--nw-spacing-0)'
                }}
              >
                Action Failed
              </h4>
              <p
                className="gba:text-sm"
                style={{
                  color: 'var(--nw-color-muted-foreground)',
                  margin: 'var(--nw-spacing-0)',
                  marginTop: 'var(--nw-spacing-1)'
                }}
              >
                {formatErrorMessage(actionError)}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={clearActionError} className="gba:shrink-0">
              Dismiss
            </Button>
          </div>
        </Alert>
      )}

      {/* Always render list; let it show inline loading to avoid unmounting filters */}
      <div className="gba:h-full gba:w-full gba:flex-1 gba:min-h-0">
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
          onPageChange={(page, size) => loadQueries(filters as any, page, size)}
          filters={filters}
          onFilter={handleFiltersChange}
          onCreateNew={handleCreateQuery}
          error={error || undefined}
          onRetry={refetch}
          formatErrorMessage={formatErrorMessage}
        />
      </div>

      {/* Query Form Modal */}
      <QueryDefinitionForm
        query={selectedQuery}
        visible={showForm}
        onSave={handleSaveQuery}
        onCancel={handleCancelForm}
        isLoading={isCreating || isUpdating}
        defaultQueryType={activeQueryType}
        currentService={activeService}
      />
    </div>
  )

  const renderServiceContent = (service: Services) => {
    return (
      <div className="gba:h-full gba:w-full">
        <Tabs
          key={service}
          value={activeQueryType}
          onValueChange={value => {
            if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
            setActiveQueryType(value as QueryType)
            // Reset filters and let the hook's effect load based on new queryType
            setFilters({})
          }}
          className="gba:h-full gba:w-full"
        >
          <TabsList className="gba:grid gba:w-full gba:grid-cols-2" data-testid={`query-type-tabs-${service}`}>
            <TabsTrigger
              value={QueryType.DATASET}
              className="gba:flex gba:items-center"
              style={{ gap: 'var(--nw-spacing-2)' }}
            >
              <DatabaseIcon />
              Dataset Queries
            </TabsTrigger>
            <TabsTrigger
              value={QueryType.TIMESERIES}
              className="gba:flex gba:items-center"
              style={{ gap: 'var(--nw-spacing-2)' }}
            >
              <ChartBarIcon />
              Timeseries Queries
            </TabsTrigger>
          </TabsList>
          <TabsContent value={QueryType.DATASET} className="gba:h-full gba:w-full">
            {renderQueryTypeContent()}
          </TabsContent>
          <TabsContent value={QueryType.TIMESERIES} className="gba:h-full gba:w-full">
            {renderQueryTypeContent()}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <>
      <PageLayout
        headerIcon={<GearIcon />}
        headerLabel="Query Manager"
        pageHeaderRight={
          <div className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-3)' }}>
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
                setFilters({})
                loadQueries({}, 0, pageSize)
              }}
              disabled={isLoading}
              data-testid="refresh-queries-button"
              className="gba:flex gba:items-center gba:whitespace-nowrap"
              style={{ gap: 'var(--nw-spacing-2)' }}
            >
              <ArrowClockwiseIcon size={16} />
              Refresh
            </Button>
          </div>
        }
        contentContainer={
          <div
            className="gba:h-full gba:w-full gba:overflow-auto"
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              maxHeight: '100%'
            }}
          >
            <Tabs
              value={activeService}
              onValueChange={value => {
                // Reset filters and pagination when changing service
                if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
                setActiveService(value as Services)
                setFilters({})
                loadQueries({}, 0, pageSize)
              }}
              className="gba:h-full gba:w-full"
            >
              <TabsList
                className="gba:grid gba:w-full"
                style={{ gridTemplateColumns: `repeat(${getAllServices().length}, minmax(0, 1fr))` }}
              >
                {getAllServices().map(service => (
                  <TabsTrigger
                    key={service}
                    value={service}
                    className="gba:flex gba:items-center"
                    style={{ gap: 'var(--nw-spacing-2)' }}
                  >
                    <DatabaseIcon />
                    {getServiceLabel(service)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {getAllServices().map(service => (
                <TabsContent key={service} value={service} className="gba:h-full gba:w-full">
                  {renderServiceContent(service)}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        }
      />
      <Toaster />
    </>
  )
}

export { QueryManager }
export default QueryManager
