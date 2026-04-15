import React, { useEffect, useMemo } from 'react'
import { TaskTemplateSettings } from '@/common/components/common-relations/setting-pages/task-template'
import type { TaskTemplateEntitySelectBindings } from '@/common/components/common-relations/setting-pages/task-template/types'
import { IRM_TASK_TEMPLATE_ENTITY_OPTIONS } from '@/common/components/common-relations/setting-pages/task-template/taskTemplateEntityOptions'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentEntities } from '@/common/data/investment/hooks/useInvestmentEntities'
import { useInvestmentTaskTemplateSettings } from './hooks/useInvestmentTaskTemplateSettings'

// NOTE: These enums differ from Sales domain
// Sales: OWNER_EMPLOYEE, ACCOUNT_USER
// Investment: OWNER_EMPLOYEE_TASK_ASSIGNEE, CONTACT_TASK_ASSIGNEE
const INVESTMENT_ASSIGNEE_TYPES = [
  { value: 'OWNER_EMPLOYEE_TASK_ASSIGNEE', label: 'Owner Employee' },
  { value: 'CONTACT_TASK_ASSIGNEE', label: 'Contact' }
]

// NOTE: These enums differ from Sales domain
// Sales: SKIP_TASK, EXECUTE_NEXT_DAY, EXECUTE_PREV_DAY
// Investment: HOLIDAY_POLICY_SKIP, HOLIDAY_POLICY_NEXT_DAY, HOLIDAY_POLICY_PREV_DAY
const INVESTMENT_HOLIDAY_POLICIES = [
  { value: 'HOLIDAY_POLICY_SKIP', label: 'Skip task on holiday' },
  { value: 'HOLIDAY_POLICY_NEXT_DAY', label: 'Execute next working day' },
  { value: 'HOLIDAY_POLICY_PREV_DAY', label: 'Execute previous working day' }
]

export interface TaskTemplateDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const TaskTemplateDataPage: React.FC<TaskTemplateDataPageProps> = ({
  className,
  prefixDataTestId = 'irm-task-template-data',
  onBack,
  ...context
}) => {
  const { templates, isLoading, error, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, retry } =
    useInvestmentTaskTemplateSettings(context)

  const {
    entities,
    loading: entitiesLoading,
    searchEntities,
    hasMore: entitiesHasMore,
    loadMore: loadMoreEntities,
    hydrateEntityById
  } = useInvestmentEntities(context)

  const entitySelect = useMemo<TaskTemplateEntitySelectBindings | undefined>(() => {
    if (!context.accessToken) return undefined
    return {
      entities,
      entitiesLoading,
      hasMore: entitiesHasMore,
      onEntitySearch: searchEntities,
      onEntityLoadMore: loadMoreEntities,
      hydrateEntityById
    }
  }, [
    context.accessToken,
    entities,
    entitiesLoading,
    entitiesHasMore,
    searchEntities,
    loadMoreEntities,
    hydrateEntityById
  ])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return (
    <div className={className} data-testid={`${prefixDataTestId}-container`}>
      <TaskTemplateSettings
        templates={templates}
        isLoading={isLoading}
        error={error}
        onCreate={createTemplate}
        onUpdate={updateTemplate}
        onDelete={deleteTemplate}
        onRetry={retry}
        prefixDataTestId={prefixDataTestId}
        headerTitle="Investment Task Templates"
        headerDescription="Manage recurring task templates for investment processes and portfolio management"
        onBack={onBack}
        accessToken={context.accessToken}
        businessAppContext={context}
        catalogConfigs={[
          { id: 'InvestmentTaskType', catalogIdentifier: 'InvestmentTaskType:v1', prefetch: true, pageSize: 25 },
          {
            id: 'InvestmentTaskPriority',
            catalogIdentifier: 'InvestmentTaskPriority:v1',
            prefetch: true,
            pageSize: 25
          },
          { id: 'InvestmentGroup', catalogIdentifier: 'InvestmentGroup:v1', prefetch: true, pageSize: 25 },
          {
            id: 'InvestmentType',
            catalogIdentifier: 'InvestmentType:v1',
            prefetch: true,
            pageSize: 25,
            parentField: 'eventInvestmentGroupRef'
          }
        ]}
        taskTypeCatalogId="InvestmentTaskType"
        taskPriorityCatalogId="InvestmentTaskPriority"
        templateEntityConfig={{
          entityTypeOptions: IRM_TASK_TEMPLATE_ENTITY_OPTIONS,
          showInvestmentEventFilters: true,
          prefixDataTestId,
          entitySelect
        }}
        assigneeTypes={INVESTMENT_ASSIGNEE_TYPES}
        holidayPolicies={INVESTMENT_HOLIDAY_POLICIES}
      />
    </div>
  )
}

export default TaskTemplateDataPage
