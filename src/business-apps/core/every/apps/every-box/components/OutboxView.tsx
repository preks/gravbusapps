/**
 * OutboxView Component
 * Displays outbox flows with search and filtering
 *
 * URL Parameters:
 * - flowId: ID of the selected flow to open directly
 *   Example: ?flowId=abc-123 will open the flow detail panel for flow with ID "abc-123"
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Input,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  TabSwitch,
  TabSwitchList,
  TabSwitchTrigger,
  TabSwitchBadge,
  useTranslation,
  useLocale
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { Search, RefreshCw, Zap, FileText, X } from 'lucide-react'
import { Flow } from '../types'
import { FlowCard } from './FlowCard'
import { FlowDetailDialog } from './FlowDetailDialog'
import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { sortFlowsByDate, filterFlowsBySearch } from '../utils/taskGrouping'
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch'

type FlowFilterType = 'all' | 'blinks' | 'requests'

interface OutboxViewProps {
  flows: Flow[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  accessToken: string
}

/**
 * Get initial flow ID from URL
 */
const getInitialFlowId = (): string | null => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  return urlParams.get('flowId')
}

/**
 * Update URL with flow ID
 */
const updateFlowUrl = (flowId: string | null) => {
  const urlParams = new URLSearchParams(globalThis.location.search)

  if (flowId) {
    urlParams.set('flowId', flowId)
  } else {
    urlParams.delete('flowId')
  }

  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

export const OutboxView: React.FC<OutboxViewProps> = ({ flows, isLoading, error, onRefresh, accessToken }) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  /**
   * Get empty state message based on search query and filter type
   */
  const getEmptyFlowMessage = useCallback(
    (query: string, filter: FlowFilterType): string => {
      if (query.trim()) {
        return t('outbox-empty-no-results', { query })
      }

      switch (filter) {
        case 'blinks':
          return t('outbox-empty-no-blinks')
        case 'requests':
          return t('outbox-empty-no-requests')
        default:
          return t('outbox-empty-no-workflows')
      }
    },
    [t]
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [filterType, setFilterType] = useState<FlowFilterType>('all')
  const [isInitialized, setIsInitialized] = useState(false)

  // Extract all user IDs from flows for batch fetching (assignees + initiators)
  const allUserIds = useMemo(() => {
    const userIds = new Set<string>()

    flows.forEach(flow => {
      // Initiator
      if (flow.initiatorUserId) {
        userIds.add(flow.initiatorUserId)
      }

      // Assignee for single flows
      if (flow.assignedUserId) {
        userIds.add(flow.assignedUserId)
      }

      // Assignees from grouped flows (blinks)
      if (flow.groupedFlows) {
        flow.groupedFlows.forEach(gf => {
          if (gf.assignedUserId) {
            userIds.add(gf.assignedUserId)
          }
        })
      }
    })

    return Array.from(userIds)
  }, [flows])

  // Batch fetch all employee avatars in ONE request
  const { employeeMap } = useEmployeeAvatarsBatch(
    accessToken,
    allUserIds,
    [] // No employee IDs needed
  )

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

  // Initialize selected flow from URL when flows are loaded
  useEffect(() => {
    if (!isInitialized && flows.length > 0 && !isLoading) {
      const flowIdFromUrl = getInitialFlowId()
      if (flowIdFromUrl) {
        const flowToSelect = flows.find(f => f.id === flowIdFromUrl)
        if (flowToSelect) {
          setSelectedFlow(flowToSelect)
        }
      }
      setIsInitialized(true)
    }
  }, [flows, isLoading, isInitialized])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const flowIdFromUrl = getInitialFlowId()
      if (flowIdFromUrl) {
        const flowToSelect = flows.find(f => f.id === flowIdFromUrl)
        if (flowToSelect) {
          setSelectedFlow(flowToSelect)
        } else {
          setSelectedFlow(null)
        }
      } else {
        setSelectedFlow(null)
      }
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [flows])

  // Handler to select a flow and update URL
  // Toggle behavior: clicking on already selected flow will deselect it
  const handleSelectFlow = useCallback(
    (flow: Flow | null) => {
      // If clicking on the currently selected flow, deselect it (close detail panel)
      if (flow && selectedFlow?.id === flow.id) {
        setSelectedFlow(null)
        updateFlowUrl(null)
      } else {
        // Otherwise, select the new flow
        setSelectedFlow(flow)
        updateFlowUrl(flow?.id || null)
      }
    },
    [selectedFlow]
  )

  // Handler to close flow detail
  const handleCloseFlow = useCallback(() => {
    setSelectedFlow(null)
    updateFlowUrl(null)
  }, [])

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
    return <LoadingSkeleton type="flow" />
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:m-4">
        <AlertDescription>
          <div className="gba:space-y-2">
            <p className="gba:font-semibold">{t('outbox-error-unable')}</p>
            <p className="gba:text-sm">{t('outbox-error-server')}</p>
            <Button onClick={onRefresh} variant="outline" size="sm" className="gba:mt-2">
              {t('outbox-try-again')}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="gba:flex gba:gap-4 gba:h-full gba:overflow-hidden gba:px-6" data-testid="outbox-view">
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
              placeholder={t('outbox-search-placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-11 gba:pr-9"
              style={{ paddingLeft: '2.75rem' }}
              data-testid="outbox-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground hover:gba:text-foreground gba:cursor-pointer gba:z-10"
                data-testid="outbox-search-clear-button"
                aria-label={t('outbox-clear-search')}
              >
                <X className="gba:h-4 gba:w-4" />
              </button>
            )}
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
        <div
          className="gba:overflow-x-auto gba:overflow-y-hidden gba:-mx-3 gba:px-3"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--nw-border) transparent'
          }}
        >
          <TabSwitch value={filterType} onValueChange={value => setFilterType(value as FlowFilterType)}>
            <TabSwitchList data-testid="outbox-filters">
              <TabSwitchTrigger
                value="all"
                data-testid="outbox-filter-all"
                endAdornment={<TabSwitchBadge>{flowCounts.all}</TabSwitchBadge>}
              >
                {t('outbox-filter-all')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="blinks"
                data-testid="outbox-filter-blinks"
                startIcon={<Zap className="gba:h-4 gba:w-4" />}
                endAdornment={<TabSwitchBadge>{flowCounts.blinks}</TabSwitchBadge>}
              >
                {t('outbox-filter-blinks')}
              </TabSwitchTrigger>
              <TabSwitchTrigger
                value="requests"
                data-testid="outbox-filter-requests"
                startIcon={<FileText className="gba:h-4 gba:w-4" />}
                endAdornment={<TabSwitchBadge>{flowCounts.requests}</TabSwitchBadge>}
              >
                {t('outbox-filter-requests')}
              </TabSwitchTrigger>
            </TabSwitchList>
          </TabSwitch>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t('outbox-error-title')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Flow List - Scrollable */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:pr-2">
          {filteredFlows.length === 0 ? (
            <EmptyState type="outbox" message={getEmptyFlowMessage(searchQuery, filterType)} />
          ) : (
            <div className="gba:space-y-2" data-testid="outbox-flow-list">
              {filteredFlows.map(flow => (
                <FlowCard
                  key={flow.id}
                  flow={flow}
                  onView={handleSelectFlow}
                  accessToken={accessToken}
                  isSelected={selectedFlow?.id === flow.id}
                  employeeMap={employeeMap}
                  t={t}
                  locale={locale}
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
        {selectedFlow && <FlowDetailDialog flow={selectedFlow} onClose={handleCloseFlow} accessToken={accessToken} />}
      </div>
    </div>
  )
}
