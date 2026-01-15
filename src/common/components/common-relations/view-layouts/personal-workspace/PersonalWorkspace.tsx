import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { PersonalWorkspaceConfig } from './types'
import { ActionButtons } from './components/header'
import { OverviewView } from './components/overview'
import { MyActivitiesView } from './components/activities'
import { MyTasksView } from './components/tasks'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface PersonalWorkspaceProps extends BusinessAppContextProps {
  config: PersonalWorkspaceConfig
}

/**
 * Generic Personal Workspace Component
 * Can be used by any module (CRM, IRM, etc.) with appropriate configuration
 *
 * Note: This component should be rendered inside a parent PageLayout (e.g., CustomerRelations, InvestmentRelations)
 * It does not include its own PageLayout to avoid nesting issues
 */
export const PersonalWorkspace: React.FC<PersonalWorkspaceProps> = ({ config, accessToken, userInfo }) => {
  // Valid tab values
  const VALID_TABS = ['overview', 'activities', 'tasks'] as const
  type ValidTab = (typeof VALID_TABS)[number]

  // Initialize tab from URL parameter
  const getInitialTab = (): ValidTab => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    const tab = urlParams.get('tab')

    if (tab && VALID_TABS.includes(tab as ValidTab)) {
      return tab as ValidTab
    }

    return 'overview' // Default tab
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab())
  const employeeId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  // Update URL when tab changes
  const updateUrl = (tab: string) => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    urlParams.set('tab', tab)
    const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
    globalThis.history.replaceState({}, '', newUrl)
  }

  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab)
    updateUrl(newTab)
  }

  // Set initial URL if tab parameter is missing
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    if (!urlParams.has('tab')) {
      updateUrl(activeTab)
    }
  }, []) // Only run once on mount

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab()
      setActiveTab(newTab)
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  // Use module-specific hooks injected via config
  const kpisResult = config.hooks.useKpis({ accessToken, userInfo }, employeeId)
  const activitiesResult = config.hooks.useActivities({ accessToken, userInfo }, employeeId)
  const tasksResult = config.hooks.useTasks({ accessToken, userInfo }, employeeId)

  return (
    <div data-testid="personal-workspace-container" className="gba:space-y-6">
      {/* Main Content Tabs with User Header */}
      <Tabs value={activeTab} onValueChange={handleTabChange} data-testid="personal-workspace-tabs">
        {/* Tabs Header with Action Menu */}
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">
              {getTranslationFromI18nKeyAndLabel(
                config.translations.overview.key,
                config.translations.overview.default
              )}
            </TabsTrigger>
            <TabsTrigger value="activities" data-testid="tab-activities">
              {getTranslationFromI18nKeyAndLabel(
                config.translations.activities.key,
                config.translations.activities.default
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-tasks">
              {getTranslationFromI18nKeyAndLabel(config.translations.tasks.key, config.translations.tasks.default)}
            </TabsTrigger>
          </TabsList>

          {/* Action Menu */}
          <ActionButtons config={config} accessToken={accessToken} />
        </div>

        <TabsContent value="overview">
          <OverviewView
            config={config}
            kpisResult={kpisResult}
            activitiesResult={activitiesResult}
            tasksResult={tasksResult}
            accessToken={accessToken}
            userInfo={userInfo}
          />
        </TabsContent>

        <TabsContent value="activities">
          {config.myActivitiesConfig ? (
            <MyActivitiesView
              config={config.myActivitiesConfig}
              accessToken={accessToken}
              userInfo={userInfo}
              dataTestId="workspace-my-activities"
            />
          ) : (
            <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
              {config.entities.activity.pluralName} view - Configuration not provided
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          {config.myTasksConfig ? (
            <MyTasksView
              config={config.myTasksConfig}
              accessToken={accessToken}
              userInfo={userInfo}
              dataTestId="workspace-my-tasks"
            />
          ) : (
            <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
              {config.entities.task.pluralName} view - Configuration not provided
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PersonalWorkspace
