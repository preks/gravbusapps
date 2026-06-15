import React, { useCallback, useEffect } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { ChartLineUpIcon } from '@phosphor-icons/react'
import { SalesActivity360Props, ActivityViewFilter } from './types'
import { ViewSelector } from './components/view-selector/ViewSelector'
import { EntitySelector } from './components/view-selector/EntitySelector'
import { ActivityView } from './components/activity-view/ActivityView'
import { MODULE_COLORS } from '@/common/constants/ui'
import { useActivity360UrlState } from './hooks/useActivity360UrlState'

const DATA_TEST_ID_PREFIX = 'SalesActivity360'
const moduleColor = MODULE_COLORS.CRM

/**
 * Sales Activity 360
 *
 * A comprehensive sales activity viewer for CEO and Sales Chiefs.
 * Flow:
 * 1. ViewSelector - Choose how to view activities (all, by-employee, by-account, etc.)
 * 2. EntitySelector - For entity-specific views, pick which entity
 * 3. ActivityView - View the activities (list + calendar tabs)
 *
 * URL parameters (bookmarkable):
 * - view=home | entity-picker | activities
 * - filter=<activity-view-filter> (required for entity-picker and activities)
 * - tab=list | calendar | comparison (activities view; comparison only when filter=all)
 * - entityId / employeeId (optional, for entity-scoped views)
 * - entityName (optional display hint)
 */
export const SalesActivity360: React.FC<SalesActivity360Props> = ({ accessToken, userInfo }) => {
  const { appScreen, activeTab, goHome, goActivities, handleTabChange } = useActivity360UrlState()

  useEffect(() => {
    if (appScreen.screen !== 'view-selector') {
      globalThis.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [appScreen])

  const handleViewSelect = useCallback(
    (filter: ActivityViewFilter) => {
      if (filter === 'all' || filter === 'by-general') {
        goActivities({ filter })
      }
    },
    [goActivities]
  )

  const handleEntitySelect = useCallback(
    (entityId: string, entityName: string) => {
      if (appScreen.screen === 'entity-selector') {
        goActivities({
          filter: appScreen.filter,
          entityId,
          entityName
        })
      }
    },
    [appScreen, goActivities]
  )

  const handleEntitySelectFromOverlay = useCallback(
    (filter: ActivityViewFilter, entityId: string, entityName: string) => {
      goActivities({ filter, entityId, entityName })
    },
    [goActivities]
  )

  const handleEmployeeSelect = useCallback(
    (employeeId: string, employeeName: string) => {
      goActivities({
        filter: 'by-employee',
        entityId: employeeId,
        entityName: employeeName
      })
    },
    [goActivities]
  )

  switch (appScreen.screen) {
    case 'activity-view':
      return (
        <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <ActivityView
            accessToken={accessToken}
            userInfo={userInfo}
            filter={appScreen.filter}
            entityId={appScreen.entityId}
            entityName={appScreen.entityName}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onBack={goHome}
          />
        </div>
      )

    case 'entity-selector':
      return (
        <div className="gba:min-h-screen gba:bg-background gba:p-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <div className="gba:max-w-4xl gba:mx-auto">
            <EntitySelector
              accessToken={accessToken}
              entityType={appScreen.filter}
              onSelect={handleEntitySelect}
              onCancel={goHome}
            />
          </div>
        </div>
      )

    case 'view-selector':
    default:
      return (
        <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <PageLayout
            headerIcon={ChartLineUpIcon}
            headerTitle="Sales Activity 360°"
            headerDescription="Real-time visibility into your entire sales operation"
            // Disable the default header back arrow (PageLayout falls back to window.history.back()).
            onBack={null as unknown as (() => void) | undefined}
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
