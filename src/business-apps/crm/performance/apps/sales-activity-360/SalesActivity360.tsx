import React, { useState, useEffect, useCallback } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { ChartLineUp } from '@phosphor-icons/react'
import { SalesActivity360Props, ActivityViewFilter } from './types'
import { ViewSelector } from './components/view-selector/ViewSelector'
import { EntitySelector } from './components/view-selector/EntitySelector'
import { ActivityView } from './components/activity-view/ActivityView'
import { MODULE_COLORS } from '@/common/constants/ui'

const DATA_TEST_ID_PREFIX = 'SalesActivity360'
const moduleColor = MODULE_COLORS.CRM

// Valid filters for URL parsing
const VALID_FILTERS: ActivityViewFilter[] = [
  'all',
  'by-employee',
  'by-account',
  'by-contact',
  'by-lead',
  'by-opportunity'
]

// Unified app state - single source of truth
type AppScreen =
  | { screen: 'view-selector' }
  | { screen: 'entity-selector'; filter: ActivityViewFilter }
  | { screen: 'activity-view'; filter: ActivityViewFilter; entityId?: string; entityName?: string }

// Parse URL parameters to determine initial state
const parseUrlParams = (): AppScreen => {
  const searchParams = new URLSearchParams(window.location.search)
  const screen = searchParams.get('screen')
  const filter = searchParams.get('filter') as ActivityViewFilter | null
  const entityId = searchParams.get('entityId')
  const entityName = searchParams.get('entityName')

  // Validate filter
  const validFilter = filter && VALID_FILTERS.includes(filter) ? filter : null

  if (screen === 'activity-view' && validFilter) {
    return {
      screen: 'activity-view',
      filter: validFilter,
      entityId: entityId || undefined,
      entityName: entityName ? decodeURIComponent(entityName) : undefined
    }
  }

  if (screen === 'entity-selector' && validFilter && validFilter !== 'all') {
    return {
      screen: 'entity-selector',
      filter: validFilter
    }
  }

  return { screen: 'view-selector' }
}

// Build URL from app state
const buildUrlFromState = (state: AppScreen): string => {
  const params = new URLSearchParams(window.location.search)

  // Preserve app param if it exists (for development)
  const appParam = params.get('app')

  const newParams = new URLSearchParams()
  if (appParam) {
    newParams.set('app', appParam)
  }

  if (state.screen === 'view-selector') {
    // Clear state params for main view
  } else if (state.screen === 'entity-selector') {
    newParams.set('screen', 'entity-selector')
    newParams.set('filter', state.filter)
  } else if (state.screen === 'activity-view') {
    newParams.set('screen', 'activity-view')
    newParams.set('filter', state.filter)
    if (state.entityId) {
      newParams.set('entityId', state.entityId)
    }
    if (state.entityName) {
      newParams.set('entityName', encodeURIComponent(state.entityName))
    }
  }

  const paramString = newParams.toString()
  return `${window.location.pathname}${paramString ? '?' + paramString : ''}`
}

/**
 * Sales Activity 360
 *
 * A comprehensive sales activity viewer for CEO and Sales Chiefs.
 * Flow:
 * 1. ViewSelector - Choose how to view activities (all, by-employee, by-account, etc.)
 * 2. EntitySelector - For entity-specific views, pick which entity
 * 3. ActivityView - View the activities (list + calendar tabs)
 */
export const SalesActivity360: React.FC<SalesActivity360Props> = ({ accessToken, userInfo }) => {
  // Single state for the entire app flow - initialize from URL
  const [appState, setAppState] = useState<AppScreen>(() => parseUrlParams())

  // Update URL when state changes and scroll to top on screen change
  useEffect(() => {
    const newUrl = buildUrlFromState(appState)
    window.history.replaceState({}, '', newUrl)

    // Scroll to top when navigating to a new screen
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [appState])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newState = parseUrlParams()
      setAppState(newState)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Handle view selection from ViewSelector (only "All Activities" now, as overlay handles others)
  const handleViewSelect = (filter: ActivityViewFilter) => {
    if (filter === 'all') {
      // "All Activities" goes DIRECTLY to activity view
      setAppState({ screen: 'activity-view', filter: 'all' })
    }
    // Entity-specific views are now handled by the overlay in ViewSelector
  }

  // Handle entity selection from EntitySelector (fallback for URL navigation)
  const handleEntitySelect = (entityId: string, entityName: string) => {
    if (appState.screen === 'entity-selector') {
      setAppState({
        screen: 'activity-view',
        filter: appState.filter,
        entityId,
        entityName
      })
    }
  }

  // Handle entity selection from the overlay in ViewSelector
  const handleEntitySelectFromOverlay = useCallback(
    (filter: ActivityViewFilter, entityId: string, entityName: string) => {
      setAppState({
        screen: 'activity-view',
        filter,
        entityId,
        entityName
      })
    },
    []
  )

  // Handle cancel from EntitySelector - go back to main selector
  const handleEntitySelectorCancel = () => {
    setAppState({ screen: 'view-selector' })
  }

  // Handle back from ActivityView - always go back to main dashboard
  const handleBack = () => {
    setAppState({ screen: 'view-selector' })
  }

  // Handle direct employee selection from AI Insights
  const handleEmployeeSelect = useCallback((employeeId: string, employeeName: string) => {
    setAppState({
      screen: 'activity-view',
      filter: 'by-employee',
      entityId: employeeId,
      entityName: employeeName
    })
  }, [])

  // Render based on current screen
  switch (appState.screen) {
    case 'activity-view':
      // Activity view uses full width like team performance for wide tables
      return (
        <div className="gba:min-h-screen gba:bg-background gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <ActivityView
            accessToken={accessToken}
            userInfo={userInfo}
            filter={appState.filter}
            entityId={appState.entityId}
            entityName={appState.entityName}
            onBack={handleBack}
          />
        </div>
      )

    case 'entity-selector':
      return (
        <div className="gba:min-h-screen gba:bg-background gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <div className="gba:max-w-4xl gba:mx-auto">
            <EntitySelector
              accessToken={accessToken}
              entityType={appState.filter}
              onSelect={handleEntitySelect}
              onCancel={handleEntitySelectorCancel}
            />
          </div>
        </div>
      )

    case 'view-selector':
    default:
      return (
        <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <PageLayout
            headerIcon={ChartLineUp}
            headerTitle="Sales Activity 360°"
            headerDescription="Real-time visibility into your entire sales operation"
            variant={moduleColor}
            className="gba:min-h-screen"
          >
            <ViewSelector
              onSelect={handleViewSelect}
              onEmployeeSelect={handleEmployeeSelect}
              onEntitySelect={handleEntitySelectFromOverlay}
              accessToken={accessToken}
            />
          </PageLayout>
        </div>
      )
  }
}

export default SalesActivity360
