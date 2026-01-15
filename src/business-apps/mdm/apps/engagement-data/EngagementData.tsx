import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Settings } from 'lucide-react'
import { ActivityTypesTab } from './components/tabs/ActivityTypesTab'
import { TaskTypesTab } from './components/tabs/TaskTypesTab'
import { TaskPrioritiesTab } from './components/tabs/TaskPrioritiesTab'
import { TaskStatusesTab } from './components/tabs/TaskStatusesTab'

export enum EngagementDataTabs {
  ACTIVITY_TYPES = 'activity-types',
  TASK_TYPES = 'task-types',
  TASK_PRIORITIES = 'task-priorities',
  TASK_STATUSES = 'task-statuses'
}

export interface EngagementDataProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'EngagementData'

const EngagementData: React.FC<EngagementDataProps> = ({ className, prefixDataTestId, ...context }) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(EngagementDataTabs.ACTIVITY_TYPES)

  // Get sourceApp from URL params - required for this app to work
  const urlParams = new URLSearchParams(window.location.search)
  const sourceApp = urlParams.get('sourceApp')

  // Validate sourceApp parameter
  useEffect(() => {
    if (!sourceApp || !['CRM', 'IRM'].includes(sourceApp)) {
      console.error('EngagementData requires sourceApp parameter (CRM or IRM)')
    }
  }, [sourceApp])

  // Handle tab changes from URL hash or query params
  useEffect(() => {
    const handleLocationChange = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      const hashTab = window.location.hash.replace('#', '')

      const tab = tabParam || hashTab
      if (tab && Object.values(EngagementDataTabs).includes(tab as EngagementDataTabs)) {
        setActiveTab(tab as EngagementDataTabs)
      }
    }

    handleLocationChange()
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  const handleTabChange = (key: string) => {
    setActiveTab(key as EngagementDataTabs)

    // Update URL with new tab
    const url = new URL(window.location.href)
    url.searchParams.set('tab', key)
    url.hash = key
    window.history.pushState({}, '', url.toString())
  }

  // Show error if sourceApp is missing
  if (!sourceApp || !['CRM', 'IRM'].includes(sourceApp)) {
    return (
      <div
        className={`gba:w-full gba:h-full ${className || ''}`}
        data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Container`}
      >
        <PageHeader
          title={t('mdm.engagement_data', 'Engagement Data')}
          subtitle={t('mdm.engagement_data.description', 'Manage activity types, task types, priorities, and statuses')}
          avatar={<Settings className="gba:h-5 gba:w-5" />}
          data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Header`}
        />
        <div className="gba:p-6">
          <div className="gba:mt-6">
            <Alert className="gba:border-red-200 gba:bg-red-50">
              <AlertDescription>
                {t(
                  'mdm.engagement_data.source_app_required',
                  'This application requires a sourceApp parameter (CRM or IRM) to function properly.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`gba:w-full gba:h-full ${className || ''}`}
      data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Container`}
    >
      <PageHeader
        title={t('mdm.engagement_data', 'Engagement Data')}
        subtitle={t('mdm.engagement_data.description', 'Manage activity types, task types, priorities, and statuses')}
        avatar={<Settings className="gba:h-5 gba:w-5" />}
        data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Header`}
      />
      <div className="gba:p-6">
        <div className="gba:mt-6">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Tabs`}
          >
            <TabsList className="gba:grid gba:w-full gba:grid-cols-4">
              <TabsTrigger value={EngagementDataTabs.ACTIVITY_TYPES}>
                {t('mdm.activity_types', 'Activity Types')}
              </TabsTrigger>
              <TabsTrigger value={EngagementDataTabs.TASK_TYPES}>{t('mdm.task_types', 'Task Types')}</TabsTrigger>
              <TabsTrigger value={EngagementDataTabs.TASK_PRIORITIES}>
                {t('mdm.task_priorities', 'Task Priorities')}
              </TabsTrigger>
              <TabsTrigger value={EngagementDataTabs.TASK_STATUSES}>
                {t('mdm.task_statuses', 'Task Statuses')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={EngagementDataTabs.ACTIVITY_TYPES} className="gba:mt-6">
              <ActivityTypesTab
                {...context}
                sourceApp={sourceApp as 'CRM' | 'IRM'}
                prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
              />
            </TabsContent>

            <TabsContent value={EngagementDataTabs.TASK_TYPES} className="gba:mt-6">
              <TaskTypesTab
                {...context}
                sourceApp={sourceApp as 'CRM' | 'IRM'}
                prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
              />
            </TabsContent>

            <TabsContent value={EngagementDataTabs.TASK_PRIORITIES} className="gba:mt-6">
              <TaskPrioritiesTab
                {...context}
                sourceApp={sourceApp as 'CRM' | 'IRM'}
                prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
              />
            </TabsContent>

            <TabsContent value={EngagementDataTabs.TASK_STATUSES} className="gba:mt-6">
              <TaskStatusesTab
                {...context}
                sourceApp={sourceApp as 'CRM' | 'IRM'}
                prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default EngagementData
export { EngagementData }
