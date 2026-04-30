import React, { useState } from 'react'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { HandshakeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '../hooks/useCatalogSettings'
import { getCatalogUsageCheckSpecs, useCatalogDeleteAvailability } from '../hooks/useCatalogDeleteAvailability'
import { CatalogTab } from '../components/CatalogTab'
import TaskTypeConfigurationPage from '../task-type-configuration/TaskTypeConfigurationPage'

export interface EngagementSettingsConfig {
  activityTypeCatalog: string
  taskTypeCatalog: string
  taskPriorityCatalog: string
  dataTestIdPrefix: string
  headerTitle?: string
  headerDescription?: string
  showConfigurationTab?: boolean
}

export interface EngagementSettingsLayoutProps extends BusinessAppContextProps {
  config: EngagementSettingsConfig
  initialTab?: 'activity-types' | 'task-types' | 'task-priorities' | 'task-type-config'
  onBack?: () => void
  className?: string
}

export const EngagementSettingsLayout: React.FC<EngagementSettingsLayoutProps> = ({
  config,
  initialTab = 'activity-types',
  onBack,
  className,
  ...context
}) => {
  const [active, setActive] = useState<'activity-types' | 'task-types' | 'task-priorities' | 'task-type-config'>(
    initialTab
  )

  // Call hooks internally based on config
  const activityTypes = useCatalogSettings(context, config.activityTypeCatalog)
  const taskTypes = useCatalogSettings(context, config.taskTypeCatalog)
  const taskPriorities = useCatalogSettings(context, config.taskPriorityCatalog)
  const getActivityTypeDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    'Activity Type',
    getCatalogUsageCheckSpecs(config.activityTypeCatalog)
  )
  const getTaskTypeDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    'Task Type',
    getCatalogUsageCheckSpecs(config.taskTypeCatalog)
  )
  const getTaskPriorityDeleteAvailability = useCatalogDeleteAvailability(
    context.accessToken,
    'Task Priority',
    getCatalogUsageCheckSpecs(config.taskPriorityCatalog)
  )

  return (
    <PageLayout
      headerIcon={HandshakeIcon}
      headerTitle={config.headerTitle || 'Engagement Data'}
      headerDescription={config.headerDescription || 'Manage activity types, task types, and priorities'}
      onBack={onBack}
      className={className}
      data-testid={`${config.dataTestIdPrefix}-Container`}
    >
      <Tabs value={active} onValueChange={k => setActive(k as any)} data-testid={`${config.dataTestIdPrefix}-Tabs`}>
        <TabsList>
          <TabsTrigger value="activity-types">Activity Types</TabsTrigger>
          <TabsTrigger value="task-types">Task Types</TabsTrigger>
          <TabsTrigger value="task-priorities">Task Priorities</TabsTrigger>
          {config.showConfigurationTab && <TabsTrigger value="task-type-config">Task Type Configuration</TabsTrigger>}
        </TabsList>

        <TabsContent value="activity-types">
          <CatalogTab
            entityName="Activity Type"
            dataTestId={`${config.dataTestIdPrefix}-ActivityTypes`}
            getDeleteAvailability={getActivityTypeDeleteAvailability}
            {...activityTypes}
          />
        </TabsContent>

        <TabsContent value="task-types">
          <CatalogTab
            entityName="Task Type"
            dataTestId={`${config.dataTestIdPrefix}-TaskTypes`}
            getDeleteAvailability={getTaskTypeDeleteAvailability}
            {...taskTypes}
          />
        </TabsContent>

        <TabsContent value="task-priorities">
          <CatalogTab
            entityName="Task Priority"
            dataTestId={`${config.dataTestIdPrefix}-TaskPriorities`}
            getDeleteAvailability={getTaskPriorityDeleteAvailability}
            {...taskPriorities}
          />
        </TabsContent>

        {config.showConfigurationTab && (
          <TabsContent value="task-type-config">
            <TaskTypeConfigurationPage
              accessToken={context.accessToken}
              userInfo={context.userInfo}
              additionalData={context.additionalData}
              prefixDataTestId={config.dataTestIdPrefix}
              catalogIdentifier={config.taskTypeCatalog}
              hidePageLayout={true}
            />
          </TabsContent>
        )}
      </Tabs>
    </PageLayout>
  )
}
