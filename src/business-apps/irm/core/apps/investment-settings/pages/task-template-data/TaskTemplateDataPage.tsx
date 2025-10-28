import React, { useEffect } from 'react'
import { TaskTemplateSettings } from '@/common/components/common-relations/setting-pages/task-template'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTaskTemplateSettings } from './hooks/useInvestmentTaskTemplateSettings'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'

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

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const renderAdditionalFields = (form: any) =>
    form.watch('schedulingType') === 'EVENTS' && (
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <FormField
          control={form.control}
          name="investmentGroupRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Group</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="InvestmentGroup:v1"
                  value={field.value || null}
                  onValueChange={field.onChange}
                  data-testid={`${prefixDataTestId}-events-investment-group-select`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="investmentTypeRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investment Type</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="InvestmentType:v1"
                  parentField="investmentGroupRef"
                  requireSourceForEnable={true}
                  value={field.value || null}
                  onValueChange={field.onChange}
                  data-testid={`${prefixDataTestId}-events-investment-type-select`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    )

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
        renderAdditionalFields={renderAdditionalFields}
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
            parentField: 'investmentGroupRef' // Uni-directional: InvestmentGroup → InvestmentType (referencing form field name)
          }
        ]}
        taskTypeCatalogId="InvestmentTaskType"
        taskPriorityCatalogId="InvestmentTaskPriority"
        hasEventConfig={true}
        assigneeTypes={INVESTMENT_ASSIGNEE_TYPES}
        holidayPolicies={INVESTMENT_HOLIDAY_POLICIES}
      />
    </div>
  )
}

export default TaskTemplateDataPage
