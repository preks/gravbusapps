/**
 * OutboxView Component
 * Displays outbox flows with search and filtering
 */

import React, { useState, useMemo } from 'react'
import { Input, Button, Badge, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system'
import { Search, RefreshCw, Zap, FileText } from 'lucide-react'
import { Flow } from '../types'
import { FlowCard } from './FlowCard'
import { FlowDetailDialog } from './FlowDetailDialog'
import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { sortFlowsByDate, filterFlowsBySearch } from '../utils/taskGrouping'

type FlowFilterType = 'all' | 'blinks' | 'requests'

interface OutboxViewProps {
  flows: Flow[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  accessToken: string
}

export const OutboxView: React.FC<OutboxViewProps> = ({ flows, isLoading, error, onRefresh, accessToken }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [filterType, setFilterType] = useState<FlowFilterType>('all')

  // Helper functions to categorize flows
  const isBlinkFlow = (flow: Flow): boolean => {
    return !!(flow.blinkGroupId || flow.isGrouped || flow.tags?.app === 'quick-task')
  }

  const isRequestFlow = (flow: Flow): boolean => {
    // Service requests
    if (flow.tags?.app === 'AppCatalog:1:SVC') return true

    // Expense flows from Kogito (check templateName or templateId for expense-related keywords)
    const templateName = flow.templateName.toLowerCase()
    const templateId = flow.templateId?.toLowerCase() || ''
    if (templateName.includes('expense') || templateId.includes('expense') || templateId.includes('reimbursement'))
      return true

    // Absence requests from Kogito (check for absence/vacation/leave keywords)
    if (
      templateName.includes('absence') ||
      templateName.includes('vacation') ||
      templateName.includes('leave') ||
      templateName.includes('time off') ||
      templateId.includes('absence') ||
      templateId.includes('vacation') ||
      templateId.includes('leave')
    )
      return true

    return false
  }

  // Filter and sort flows
  const filteredFlows = useMemo(() => {
    let result = flows

    // Apply type filter
    if (filterType === 'blinks') {
      result = result.filter(isBlinkFlow)
    } else if (filterType === 'requests') {
      result = result.filter(isRequestFlow)
    }
    // 'all' shows all flows - no filtering

    // Apply search filter
    if (searchQuery.trim()) {
      result = filterFlowsBySearch(result, searchQuery)
    }

    // Sort by date
    result = sortFlowsByDate(result)

    return result
  }, [flows, searchQuery, filterType])

  // Count flows by type for badges
  const flowCounts = useMemo(() => {
    return {
      all: flows.length,
      blinks: flows.filter(isBlinkFlow).length,
      requests: flows.filter(isRequestFlow).length
    }
  }, [flows])

  if (isLoading && flows.length === 0) {
    return <LoadingSkeleton count={5} type="flow" />
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:m-4">
        <AlertDescription>
          <div className="gba:space-y-2">
            <p className="gba:font-semibold">Unable to load outflows</p>
            <p className="gba:text-sm">
              The server is experiencing performance issues. This is a known backend problem.
            </p>
            <Button onClick={onRefresh} variant="outline" size="sm" className="gba:mt-2">
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="gba:flex gba:gap-4 gba:h-full gba:overflow-hidden" data-testid="outbox-view">
      {/* Master Panel - Flow List */}
      <div
        className={`gba:flex gba:flex-col gba:gap-4 gba:h-full gba:transition-all gba:duration-500 gba:ease-in-out ${
          selectedFlow ? 'gba:w-[45%]' : 'gba:w-full'
        }`}
      >
        {/* Search and Actions */}
        <div className="gba:flex gba:items-center gba:gap-4">
          <div className="gba:relative gba:flex-1">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-11"
              style={{ paddingLeft: '2.75rem' }}
              data-testid="outbox-search-input"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            data-testid="outbox-refresh-button"
          >
            <RefreshCw className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Flow Type Filters */}
        <div className="gba:flex gba:gap-2 gba:flex-wrap" data-testid="outbox-filters">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            data-testid="outbox-filter-all"
            className="gba:flex gba:items-center gba:gap-2"
          >
            All
            <Badge variant="secondary" className="gba:ml-1">
              {flowCounts.all}
            </Badge>
          </Button>
          <Button
            variant={filterType === 'blinks' ? 'default' : 'outline'}
            onClick={() => setFilterType('blinks')}
            data-testid="outbox-filter-blinks"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <Zap className="gba:h-4 gba:w-4" />
            Blinks
            <Badge variant="secondary" className="gba:ml-1">
              {flowCounts.blinks}
            </Badge>
          </Button>
          <Button
            variant={filterType === 'requests' ? 'default' : 'outline'}
            onClick={() => setFilterType('requests')}
            data-testid="outbox-filter-requests"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <FileText className="gba:h-4 gba:w-4" />
            Requests
            <Badge variant="secondary" className="gba:ml-1">
              {flowCounts.requests}
            </Badge>
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error Loading Flows</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Flow List - Scrollable */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:pr-2">
          {filteredFlows.length === 0 ? (
            <EmptyState
              type="outbox"
              message={
                searchQuery.trim()
                  ? `No workflows found matching "${searchQuery}"`
                  : filterType === 'blinks'
                    ? 'No blinks sent yet'
                    : filterType === 'requests'
                      ? 'No requests initiated yet'
                      : 'You have not initiated any workflows yet'
              }
            />
          ) : (
            <div className="gba:space-y-2" data-testid="outbox-flow-list">
              {filteredFlows.map(flow => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  onView={setSelectedFlow}
                  accessToken={accessToken}
                  isSelected={selectedFlow?.id === flow.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel - Flow Details */}
      <div
        className={`gba:flex-1 gba:transition-all gba:duration-500 gba:ease-in-out gba:overflow-hidden ${
          selectedFlow
            ? 'gba:translate-x-0 gba:opacity-100 gba:w-[55%]'
            : 'gba:translate-x-full gba:opacity-0 gba:w-0 gba:pointer-events-none'
        }`}
      >
        {selectedFlow && (
          <FlowDetailDialog
            flow={selectedFlow}
            open={!!selectedFlow}
            onClose={() => setSelectedFlow(null)}
            accessToken={accessToken}
          />
        )}
      </div>
    </div>
  )
}
