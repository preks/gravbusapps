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
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  EmptyState as DesignEmptyState,
  useTranslation,
  useLocale
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { Flow } from '../types'
import { FlowCard } from './FlowCard'
import { FlowDetailContent } from './FlowDetailContent'
import { EmptyState } from './EmptyState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { sortFlowsByDate, filterFlowsBySearch } from '../utils/taskGrouping'
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch'
import { FilterType } from './FiltersDropdown'

type FlowFilterType = 'all' | 'blinks' | 'requests'

interface OutboxViewProps {
  flows: Flow[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  accessToken: string
  // Global search and filters from parent
  globalSearch?: string
  selectedFilters?: FilterType[]
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

export const OutboxView: React.FC<OutboxViewProps> = ({
  flows,
  isLoading,
  error,
  onRefresh,
  accessToken,
  globalSearch = '',
  selectedFilters = ['all']
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  /**
   * Get empty state message based on filter type
   */
  const getEmptyFlowMessage = useCallback(
    (filter: FlowFilterType): string => {
      if (globalSearch.trim()) {
        return t('outbox-empty-no-results', { query: globalSearch })
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
    [t, globalSearch]
  )
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  // Map selectedFilters from parent to local filterType
  const filterType: FlowFilterType = selectedFilters.includes('all')
    ? 'all'
    : selectedFilters.includes('blinks')
      ? 'blinks'
      : selectedFilters.includes('requests')
        ? 'requests'
        : 'all'
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

  // Initialize selected flow from URL when flows are loaded, or auto-select first flow
  useEffect(() => {
    if (!isInitialized && flows.length > 0 && !isLoading) {
      const flowIdFromUrl = getInitialFlowId()
      if (flowIdFromUrl) {
        const flowToSelect = flows.find(f => f.id === flowIdFromUrl)
        if (flowToSelect) {
          setSelectedFlow(flowToSelect)
        } else {
          // If flow from URL not found, select first flow
          setSelectedFlow(flows[0])
          updateFlowUrl(flows[0].id)
        }
      } else {
        // No flow in URL, auto-select first flow
        setSelectedFlow(flows[0])
        updateFlowUrl(flows[0].id)
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
    if (globalSearch.trim()) {
      result = filterFlowsBySearch(result, globalSearch)
    }

    // Sort by date
    result = sortFlowsByDate(result)

    return result
  }, [flows, globalSearch, filterType])

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
    <div className="gba:flex gba:h-full gba:overflow-hidden gba:gap-0" data-testid="outbox-view">
      {/* Master Panel - Flow List (always visible, fixed width) */}
      <div className="gba:h-full gba:flex gba:flex-col gba:w-[480px] gba:flex-shrink-0 gba:bg-muted/30 gba:border-r gba:border-border">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t('outbox-error-title')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Flow List - Scrollable */}
        <div className="gba:flex-1 gba:overflow-y-auto">
          {filteredFlows.length === 0 ? (
            <EmptyState type="outbox" message={getEmptyFlowMessage(filterType)} />
          ) : (
            <div data-testid="outbox-flow-list">
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

      {/* Detail Panel - Flow Details (always visible, fills remaining space) */}
      <div className="gba:flex gba:flex-col gba:flex-1 gba:overflow-hidden gba:min-h-0">
        {selectedFlow ? (
          <div className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:p-6" data-testid="flow-detail-dialog">
            <FlowDetailContent flow={selectedFlow} onClose={handleCloseFlow} accessToken={accessToken} />
          </div>
        ) : (
          <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-background">
            <DesignEmptyState
              type="no-data"
              title={t('outbox-no-flow-selected')}
              description={t('outbox-select-flow-prompt')}
              data-testid="flow-detail-empty"
            />
          </div>
        )}
      </div>
    </div>
  )
}
