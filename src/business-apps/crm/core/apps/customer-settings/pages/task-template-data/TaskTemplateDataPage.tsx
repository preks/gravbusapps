import React, { useEffect } from 'react'
import { TaskTemplateSettings } from '@/common/components/common-relations/setting-pages/task-template'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesTaskTemplateSettings } from './hooks/useSalesTaskTemplateSettings'

// NOTE: These enums differ from Investment domain
// Sales: OWNER_EMPLOYEE, ACCOUNT_USER
// Investment: OWNER_EMPLOYEE_TASK_ASSIGNEE, CONTACT_TASK_ASSIGNEE
const SALES_ASSIGNEE_TYPES = [
  { value: 'OWNER_EMPLOYEE', label: 'Owner Employee' },
  { value: 'ACCOUNT_USER', label: 'Account User' }
]

// NOTE: These enums differ from Investment domain
// Sales: SKIP_TASK, EXECUTE_NEXT_DAY, EXECUTE_PREV_DAY
// Investment: HOLIDAY_POLICY_SKIP, HOLIDAY_POLICY_NEXT_DAY, HOLIDAY_POLICY_PREV_DAY
const SALES_HOLIDAY_POLICIES = [
  { value: 'SKIP_TASK', label: 'Skip task on holiday' },
  { value: 'EXECUTE_NEXT_DAY', label: 'Execute next working day' },
  { value: 'EXECUTE_PREV_DAY', label: 'Execute previous working day' }
]

export interface TaskTemplateDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const TaskTemplateDataPage: React.FC<TaskTemplateDataPageProps> = ({
  className,
  prefixDataTestId = 'crm-task-template-data',
  onBack,
  ...context
}) => {
  const { templates, isLoading, error, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, retry } =
    useSalesTaskTemplateSettings(context)

  // Fetch templates on mount
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
        headerTitle="Sales Task Templates"
        headerDescription="Manage recurring task templates for sales processes and customer engagement"
        onBack={onBack}
        accessToken={context.accessToken}
        businessAppContext={context}
        catalogConfigs={[
          { id: 'SalesTaskType', catalogIdentifier: 'SalesTaskType:v1', prefetch: true, pageSize: 25 },
          { id: 'SalesTaskPriority', catalogIdentifier: 'SalesTaskPriority:v1', prefetch: true, pageSize: 25 }
        ]}
        taskTypeCatalogId="SalesTaskType"
        taskPriorityCatalogId="SalesTaskPriority"
        assigneeTypes={SALES_ASSIGNEE_TYPES}
        holidayPolicies={SALES_HOLIDAY_POLICIES}
      />
    </div>
  )
}

export default TaskTemplateDataPage
