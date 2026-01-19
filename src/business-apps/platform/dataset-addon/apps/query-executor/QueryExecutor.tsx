import React, { useState } from 'react'
import {
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Toaster
} from '@newwork/nw-design-system'
import {
  ArrowClockwiseIcon,
  PlayCircleIcon,
  DatabaseIcon,
  InfoIcon,
  WarningCircleIcon,
  UserIcon,
  MoneyIcon,
  ClockIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout } from '@/components/layout/pageLayout'
import { QueryDefinition, Services, getAllServices, getServiceLabel } from '@/common/network/dataset'
import { useQueryExecutorData } from './hooks/useQueryExecutorData'
import { QueryList } from './components/QueryList'
import { QueryExecutionForm } from './components/QueryExecutionForm'
import { QueryResults } from './components/QueryResults'

const QueryExecutor: React.FC<BusinessAppContextProps> = context => {
  const [selectedQuery, setSelectedQuery] = useState<QueryDefinition | null>(null)
  const [showExecutionForm, setShowExecutionForm] = useState(false)
  const [activeService, setActiveService] = useState<Services>(Services.EMPLOYEE)

  const {
    queries,
    isLoading,
    error,
    executionResults,
    isExecuting,
    executionError,
    executeQuery,
    clearResults,
    refetch
  } = useQueryExecutorData(context, activeService)

  const getServiceIcon = (service: Services) => {
    switch (service) {
      case Services.EMPLOYEE:
        return <UserIcon size={16} />
      case Services.EMPLOYEE_EXPENSE:
        return <MoneyIcon size={16} />
      case Services.EMPLOYEE_TIME:
        return <ClockIcon size={16} />
      case Services.CUSTOMER_RELATIONS:
        return <UsersThreeIcon size={16} />
      default:
        return <DatabaseIcon size={16} />
    }
  }

  const handleExecuteQuery = (query: QueryDefinition) => {
    setSelectedQuery(query)
    setShowExecutionForm(true)
  }

  const handleExecuteWithParameters = async (parameters: any) => {
    if (selectedQuery) {
      await executeQuery(selectedQuery.name, selectedQuery.queryType, parameters)
      setShowExecutionForm(false)
      setSelectedQuery(null)
    }
  }

  const handleCancelExecution = () => {
    setShowExecutionForm(false)
    setSelectedQuery(null)
  }

  const formatErrorMessage = (error: string) => {
    // Handle common error patterns
    if (error.includes('403')) {
      return "Access denied. You don't have permission to execute queries."
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

  const renderServiceContent = (service: Services) => (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'var(--nw-spacing-4)',
        paddingBottom: 'var(--nw-spacing-4)',
        paddingLeft: 'var(--nw-spacing-6)',
        paddingRight: 'var(--nw-spacing-6)',
        width: '100%'
      }}
    >
      {/* Error Display */}
      {error && (
        <Alert
          className="gba:border-destructive gba:bg-destructive/10"
          style={{ marginBottom: 'var(--nw-spacing-4)' }}
          data-testid="queries-error-alert"
        >
          <div className="gba:flex gba:items-start" style={{ gap: 'var(--nw-spacing-3)' }}>
            <WarningCircleIcon
              className="gba:shrink-0"
              style={{
                color: 'var(--nw-color-destructive)',
                marginTop: 'var(--nw-spacing-1)'
              }}
              size={20}
            />
            <div className="gba:flex-1">
              <h4
                className="gba:font-semibold gba:text-lg"
                style={{
                  color: 'var(--nw-color-destructive)',
                  margin: 'var(--nw-spacing-0)'
                }}
              >
                Unable to Load Queries
              </h4>
              <p
                className="gba:text-sm"
                style={{
                  color: 'var(--nw-color-muted-foreground)',
                  margin: 'var(--nw-spacing-0)',
                  marginTop: 'var(--nw-spacing-1)'
                }}
              >
                {formatErrorMessage(error)}
              </p>
            </div>
            <Button
              size="sm"
              onClick={refetch}
              className="gba:shrink-0 gba:min-w-[70px] gba:h-8"
              style={{ fontSize: '12px', padding: 'var(--nw-spacing-1) var(--nw-spacing-3)' }}
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Execution Error Display */}
      {executionError && (
        <Alert
          className="gba:border-destructive gba:bg-destructive/10"
          style={{ marginBottom: 'var(--nw-spacing-4)' }}
          data-testid="execution-error-alert"
        >
          <div className="gba:flex gba:items-start" style={{ gap: 'var(--nw-spacing-3)' }}>
            <WarningCircleIcon
              className="gba:shrink-0"
              style={{
                color: 'var(--nw-color-destructive)',
                marginTop: 'var(--nw-spacing-1)'
              }}
              size={20}
            />
            <div className="gba:flex-1">
              <h4
                className="gba:font-semibold gba:text-lg"
                style={{
                  color: 'var(--nw-color-destructive)',
                  margin: 'var(--nw-spacing-0)'
                }}
              >
                Query Execution Failed
              </h4>
              <p
                className="gba:text-sm"
                style={{
                  color: 'var(--nw-color-muted-foreground)',
                  margin: 'var(--nw-spacing-0)',
                  marginTop: 'var(--nw-spacing-1)'
                }}
              >
                {formatErrorMessage(executionError)}
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div
          className="gba:flex gba:justify-center gba:items-center"
          style={{
            paddingTop: 'var(--nw-spacing-12)',
            paddingBottom: 'var(--nw-spacing-12)'
          }}
        >
          <Spinner />
          <span style={{ marginLeft: 'var(--nw-spacing-3)' }}>Loading available queries...</span>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          {/* Show QueryResults if available, otherwise show QueryList */}
          {executionResults ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
              }}
            >
              <QueryResults results={executionResults} onClear={clearResults} />
            </div>
          ) : // Query List taking full available space
          queries.length > 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
              }}
            >
              <QueryList queries={queries} onExecuteQuery={handleExecuteQuery} isExecuting={isExecuting} />
            </div>
          ) : (
            <Alert variant="default" data-testid="no-queries-alert">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>No Queries Available</AlertTitle>
              <AlertDescription>
                There are no active queries available for execution in {getServiceLabel(service)}. Please contact your
                administrator to create and activate queries.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Query Execution Form Modal */}
      <QueryExecutionForm
        query={selectedQuery}
        visible={showExecutionForm}
        onExecute={handleExecuteWithParameters}
        onCancel={handleCancelExecution}
        isExecuting={isExecuting}
      />
    </div>
  )

  return (
    <>
      <PageLayout
        headerIcon={<PlayCircleIcon />}
        headerLabel="Query Executor"
        pageHeaderRight={
          <Button
            variant="outline"
            onClick={refetch}
            disabled={isLoading}
            data-testid="refresh-queries-button"
            className="gba:flex gba:items-center gba:min-w-[100px] gba:h-9"
            style={{
              gap: 'var(--nw-spacing-2)',
              fontSize: '14px',
              padding: 'var(--nw-spacing-2) var(--nw-spacing-4)'
            }}
          >
            <ArrowClockwiseIcon size={16} />
            Refresh
          </Button>
        }
        contentContainer={
          <Tabs
            value={activeService}
            onValueChange={value => setActiveService(value as Services)}
            className="gba:h-full"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <TabsList
              style={{
                display: 'inline-flex',
                flexShrink: 0,
                width: 'auto'
              }}
            >
              {getAllServices().map(service => (
                <TabsTrigger key={service} value={service} startIcon={getServiceIcon(service)}>
                  {getServiceLabel(service)}
                </TabsTrigger>
              ))}
            </TabsList>
            {getAllServices().map(service => (
              <TabsContent
                key={service}
                value={service}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {renderServiceContent(service)}
              </TabsContent>
            ))}
          </Tabs>
        }
      />
      <Toaster />
    </>
  )
}

export { QueryExecutor }
export default QueryExecutor
